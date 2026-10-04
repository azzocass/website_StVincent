/**
 * ============================================================
 * BACKEND GOOGLE APPS SCRIPT — ÉCOLE SAINT VINCENT (CMS)
 * Reçoit les publications, uploads d'images et vidéos depuis redaction.html
 * ============================================================
 */

// 1. Réception des requêtes POST depuis redaction.html
function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(raw);
    var action = (data.action || "publish").trim();
    var result;

    if (action === "uploadVideo") {
      result = handleUploadVideo(data);
    } else if (action === "uploadImage") {
      result = handleUploadImage(data);
    } else if (action === "uploadMedia") {
      var isVideo = (data.mediaType || "").indexOf("video") !== -1 || (data.mediaName || "").match(/\.(mp4|mov|avi|webm|mkv)$/i);
      if (isVideo) {
        result = handleUploadVideo(data);
      } else {
        result = handleUploadImage(data);
      }
    } else if (action === "publish") {
      result = publishArticle(data);
    } else {
      // Si aucune action explicite mais qu'un titre est présent, traiter comme publication
      if (data.titre && data.titre.trim()) {
        result = publishArticle(data);
      } else {
        result = {
          success: false,
          message: "Action non reconnue ou titre manquant (" + action + ")."
        };
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Erreur serveur : " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. Requête GET simple (test de santé)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "CMS Actualités École Saint Vincent",
    message: "Le service est opérationnel."
  })).setMimeType(ContentService.MimeType.JSON);
}

// 3. Logique principale de publication d'article
function publishArticle(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- VÉRIFICATION DU MOT DE PASSE UNIQUE DE RÉDACTION ---
  var authCheck = verifySecretPassword(data.secretCode);
  if (!authCheck.authorized) {
    return {
      success: false,
      message: authCheck.message
    };
  }

  // --- ACCÈS À L'ONGLET ACTUALITÉS (Actu) ---
  var cleanTitle = (data.titre || "").trim();
  if (!cleanTitle) {
    return {
      success: false,
      message: "Erreur : Le titre de l'actualité est obligatoire pour publier un article."
    };
  }

  var sheet = ss ? (ss.getSheetByName("Actu") || ss.getSheetByName("Actualites") || ss.getSheets()[0]) : null;
  if (!sheet) {
    return {
      success: false,
      message: "Erreur : Impossible de trouver l'onglet des Actualités dans le Google Sheet."
    };
  }

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Date format DD/MM/YYYY
  var dateStr = "";
  if (data.date) {
    var parts = data.date.split('-'); // YYYY-MM-DD
    if (parts.length === 3) {
      dateStr = parts[2] + '/' + parts[1] + '/' + parts[0];
    }
  }
  if (!dateStr) {
    var now = new Date();
    var d = ("0" + now.getDate()).slice(-2);
    var m = ("0" + (now.getMonth() + 1)).slice(-2);
    var y = now.getFullYear();
    dateStr = d + '/' + m + '/' + y;
  }

  // Upload photo de couverture si envoyée en fichier direct
  var finalImageUrl = (data.imageUrl || "").trim();
  if (data.imageBase64 && data.imageName) {
    try {
      finalImageUrl = saveImageToDrive(data.imageBase64, data.imageName, data.imageType);
    } catch (errDrive) {
      Logger.log("Erreur photo Drive: " + errDrive.toString());
    }
  }

  // Upload vidéo principale si envoyée directement en fichier
  var finalVideoUrl = (data.videoUrl || "").trim();
  if (data.videoBase64 && data.videoName && !finalVideoUrl) {
    try {
      var vidResult = saveVideoToDrive(data.videoBase64, data.videoName, data.videoType);
      if (vidResult && vidResult.url) {
        finalVideoUrl = vidResult.url;
      }
    } catch (errVid) {
      Logger.log("Erreur vidéo Drive: " + errVid.toString());
    }
  }

  // Normalisation des valeurs
  var rowData = {
    "date": dateStr,
    "titre": (data.titre || "").trim(),
    "description": (data.description || "").trim(),
    "contenu": (data.contenu || "").trim(),
    "auteur": (data.auteur || "").trim(),
    "categorie": (data.categorie || "Vie de classe").trim(),
    "epingle": (data.epingle === true || String(data.epingle).toLowerCase() === "oui") ? "oui" : "non",
    "image": finalImageUrl,
    "video": finalVideoUrl,
    "lien": (data.lien || "").trim()
  };

  // Mappage dynamique selon les en-têtes réels de la ligne 1
  var newRow = [];
  var matchedCount = 0;

  for (var i = 0; i < headers.length; i++) {
    var h = normalizeHeader(headers[i]);
    if (rowData.hasOwnProperty(h)) {
      newRow.push(rowData[h]);
      matchedCount++;
    } else {
      newRow.push("");
    }
  }

  // Si l'onglet est vide ou n'a pas d'en-têtes connus, on injecte les colonnes par défaut
  if (matchedCount === 0) {
    var defaultHeaders = ["Date", "Titre", "Description", "Contenu", "Auteur", "Categorie", "Epingle", "Image", "Video", "Lien"];
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
    newRow = [
      rowData.date,
      rowData.titre,
      rowData.description,
      rowData.contenu,
      rowData.auteur,
      rowData.categorie,
      rowData.epingle,
      rowData.image,
      rowData.video,
      rowData.lien
    ];
  }

  // Ajout de la nouvelle ligne dans le Google Sheet
  sheet.appendRow(newRow);

  return {
    success: true,
    message: "Article « " + cleanTitle + " » publié avec succès !"
  };
}

/**
 * 4. Action API : Téléversement direct d'une vidéo vers le dossier Google Drive « informatiques/Videos site »
 */
function handleUploadVideo(data) {
  var auth = verifySecretPassword(data.secretCode);
  if (!auth.authorized) {
    return { success: false, message: auth.message };
  }
  if (!data.videoBase64) {
    return { success: false, message: "Aucun fichier vidéo reçu." };
  }

  try {
    var vidResult = saveVideoToDrive(data.videoBase64, data.videoName, data.videoType);
    return {
      success: true,
      url: vidResult.url,
      fileId: vidResult.id,
      name: vidResult.name,
      message: "Vidéo enregistrée avec succès dans le dossier « informatiques/Videos site » !"
    };
  } catch (err) {
    return {
      success: false,
      message: "Erreur lors du téléversement de la vidéo sur Drive : " + err.toString()
    };
  }
}

/**
 * 5. Action API : Téléversement direct d'une image vers Google Drive (ex: photo insérée dans le texte)
 */
function handleUploadImage(data) {
  var auth = verifySecretPassword(data.secretCode);
  if (!auth.authorized) {
    return { success: false, message: auth.message };
  }
  if (!data.imageBase64) {
    return { success: false, message: "Aucun fichier image reçu." };
  }

  try {
    var url = saveImageToDrive(data.imageBase64, data.imageName, data.imageType);
    return {
      success: true,
      url: url,
      message: "Photo enregistrée avec succès !"
    };
  } catch (err) {
    return {
      success: false,
      message: "Erreur lors du téléversement de la photo sur Drive : " + err.toString()
    };
  }
}

/**
 * 6. Contrôle de mot de passe unique (100% sécurisé, hors Git)
 * Priorité 1 : Propriétés du script (Script Properties)
 * Fallback 2 : Onglet actu_authorized (Colonne B)
 */
function verifySecretPassword(secretCode) {
  var cleanCode = (secretCode || "").trim();
  if (!cleanCode) {
    return {
      authorized: false,
      message: "Accès refusé : Le mot de passe de rédaction est obligatoire."
    };
  }

  // 1. Vérification dans les Propriétés du Script (Le plus sécurisé, invisible sur Git)
  var scriptProperties = PropertiesService.getScriptProperties();
  var storedPwd = scriptProperties.getProperty("CMS_PASSWORD");
  if (storedPwd && storedPwd.trim() !== "") {
    if (cleanCode === storedPwd.trim()) {
      return { authorized: true };
    } else {
      return {
        authorized: false,
        message: "Accès refusé : Le mot de passe de rédaction est incorrect."
      };
    }
  }

  // 2. Fallback de secours : Onglet actu_authorized (Colonne B ou mot de passe global)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    var userSheet = ss.getSheetByName("actu_authorized") || 
                    ss.getSheetByName("actu_authorization") || 
                    ss.getSheetByName("access") ||
                    ss.getSheetByName("Utilisateurs");
    if (userSheet) {
      var data = userSheet.getDataRange().getValues();
      for (var r = 0; r < data.length; r++) {
        var cellB = (data[r][1] || "").toString().trim();
        if (cellB && cellB.toLowerCase().indexOf("mot de passe") === -1) {
          if (cleanCode === cellB) {
            return { authorized: true };
          }
        }
      }
    }
  }

  return {
    authorized: false,
    message: "Accès refusé : Mot de passe incorrect."
  };
}

/**
 * Helper : Trouver ou créer un sous-dossier dans un dossier parent
 */
function getOrCreateSubfolder(parentFolder, subfolderName) {
  var it = parentFolder.getFoldersByName(subfolderName);
  if (it.hasNext()) {
    return it.next();
  }
  var created = parentFolder.createFolder(subfolderName);
  created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return created;
}

/**
 * 7. Répertoire Drive « informatiques/Videos site » pour les vidéos
 */
function getVideoFolder() {
  var sharedFolderId = "17u6d4AJN-g4nAajGWyhkl3o9thWmDbon";
  try {
    var sharedFolder = DriveApp.getFolderById(sharedFolderId);
    if (sharedFolder) {
      return sharedFolder;
    }
  } catch (errShared) {
    Logger.log("Dossier ID partagé non accessible directement, recherche par nom: " + errShared.toString());
  }

  var parentName = "Informatique";
  var subName = "Videos site";

  var parentFolders = DriveApp.getFoldersByName(parentName);
  var parentFolder;
  if (parentFolders.hasNext()) {
    parentFolder = parentFolders.next();
  } else {
    parentFolder = DriveApp.createFolder(parentName);
    parentFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return getOrCreateSubfolder(parentFolder, subName);
}

/**
 * Sauvegarde une vidéo dans « informatiques/Videos site »
 */
function saveVideoToDrive(base64Data, filename, mimeType) {
  var folder = getVideoFolder();
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType || "video/mp4", filename || "video.mp4");
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    id: file.getId(),
    url: "https://drive.google.com/file/d/" + file.getId() + "/preview",
    name: file.getName()
  };
}

/**
 * 8. Sauvegarde d'image sur Google Drive (« Photos Actualités École ») avec URL Thumbnail instantanée
 */
function saveImageToDrive(base64Data, filename, mimeType) {
  var folderName = "Photos Actualités École";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;

  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType || "image/jpeg", filename || "photo.jpg");
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // URL Thumbnail immédiate (sans délai CDN)
  return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200";
}

/**
 * 9. Fonction pratique à exécuter UNE FOIS dans l'éditeur Google Apps Script
 * pour définir le mot de passe partagé en toute sécurité sans toucher à Git !
 */
function configurerMotDePasseCMS(motDePasse) {
  var pwd = motDePasse || "SaintVincent2026"; // 👈 Indiquez ici votre mot de passe et cliquez sur "Exécuter"
  PropertiesService.getScriptProperties().setProperty("CMS_PASSWORD", pwd);
  Logger.log("✅ Mot de passe CMS défini avec succès : " + pwd);
}

// Helper: Normalise le nom d'en-tête
function normalizeHeader(str) {
  if (!str) return "";
  var s = str.toString().toLowerCase().trim();
  s = s.replace(/[éèêë]/g, 'e')
       .replace(/[àâä]/g, 'a')
       .replace(/[îï]/g, 'i')
       .replace(/[ôö]/g, 'o')
       .replace(/[ùûü]/g, 'u');
  return s;
}
