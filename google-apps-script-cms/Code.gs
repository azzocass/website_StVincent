/**
 * ============================================================
 * BACKEND GOOGLE APPS SCRIPT — ÉCOLE SAINT VINCENT (CMS)
 * Reçoit les publications depuis redaction.html
 * ============================================================
 */

// 1. Réception des requêtes POST depuis redaction.html
function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(raw);
    
    var result = publishArticle(data);
    
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

// 3. Logique principale de publication
function publishArticle(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- VÉRIFICATION STRICTE EMAIL (COLONNE A) & MOT DE PASSE (COLONNE B) ---
  var authCheck = verifyUserPermission(ss, data.userEmail, data.secretCode);
  if (!authCheck.authorized) {
    return {
      success: false,
      message: authCheck.message
    };
  }

  // --- ACCÈS À L'ONGLET ACTUALITÉS ---
  var sheet = ss ? (ss.getSheetByName("Actu") || ss.getSheetByName("Actualites") || ss.getSheets()[0]) : null;
  if (!sheet) {
    return {
      success: false,
      message: "Erreur : Impossible de trouver l'onglet des Actualités dans le Sheet."
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

  // Upload photo sur Google Drive si envoyée en fichier (sécurisé, ne bloque pas le Sheet)
  var finalImageUrl = (data.imageUrl || "").trim();
  if (data.imageBase64 && data.imageName) {
    try {
      finalImageUrl = saveImageToDrive(data.imageBase64, data.imageName, data.imageType);
    } catch (errDrive) {
      Logger.log("Erreur photo Drive: " + errDrive.toString());
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
    "epingle": data.epingle ? "oui" : "non",
    "image": finalImageUrl,
    "video": (data.videoUrl || "").trim(),
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
    message: "Article « " + data.titre + " » publié avec succès !"
  };
}

/**
 * 4. Contrôle strict de permission : Email (colonne A) et Mot de passe (colonne B)
 */
function verifyUserPermission(ss, email, secretCode) {
  if (!ss) return { authorized: true };

  var userSheet = ss.getSheetByName("actu_authorized") || 
                  ss.getSheetByName("actu_authorization") || 
                  ss.getSheetByName("access") || 
                  ss.getSheetByName("Utilisateurs") || 
                  ss.getSheetByName("Enseignants") ||
                  ss.getSheetByName("Autorisations");
  
  if (!userSheet) {
    return { authorized: true };
  }

  var data = userSheet.getDataRange().getValues();
  if (!data || data.length === 0) {
    return { authorized: true };
  }

  var cleanEmail = (email || "").trim().toLowerCase();
  var cleanCode = (secretCode || "").trim();

  if (!cleanEmail || !cleanCode) {
    return {
      authorized: false,
      message: "Accès refusé : L'email enseignant ET le mot de passe sont tous les deux requis."
    };
  }

  var userRowIndex = -1;
  var rowPassword = "";
  var defaultGlobalPassword = "";

  // Parcourir le tableau de l'onglet actu_authorized
  for (var r = 0; r < data.length; r++) {
    var cellA = (data[r][0] || "").toString().trim().toLowerCase();
    var cellB = (data[r][1] || "").toString().trim();

    // Récupérer un mot de passe par défaut s'il existe en ligne 1 ou 2 dans la colonne B
    if (r <= 1 && cellB && cellB.toLowerCase().indexOf("mot de passe") === -1) {
      defaultGlobalPassword = cellB;
    }

    // Chercher la ligne correspondant à l'email saisi dans la colonne A
    if (cellA === cleanEmail) {
      userRowIndex = r;
      rowPassword = cellB;
      break;
    }
  }

  // 1. Email non trouvé dans la colonne A
  if (userRowIndex === -1) {
    return {
      authorized: false,
      message: "Accès refusé : L'adresse « " + email + " » n'est pas autorisée dans l'onglet actu_authorized."
    };
  }

  // 2. Vérification du mot de passe (Colonne B de la ligne ou mot de passe global B2/B1)
  var expectedPassword = rowPassword ? rowPassword : defaultGlobalPassword;

  if (expectedPassword && cleanCode !== expectedPassword) {
    return {
      authorized: false,
      message: "Accès refusé : Le mot de passe saisi pour l'adresse « " + email + " » est incorrect."
    };
  }

  return { authorized: true };
}

// 5. Sauvegarde d'image rapide sur Google Drive avec URL Thumbnail instantanée
function saveImageToDrive(base64Data, filename, mimeType) {
  try {
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

    // URL Thumbnail immédiate (sans délai CDN ni besoin de Ctrl+Shift+R)
    return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200";
  } catch (e) {
    Logger.log("Erreur Drive: " + e.toString());
    return "";
  }
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
