/**
 * ============================================================
 * BACKEND GOOGLE APPS SCRIPT — ÉCOLE SAINT VINCENT
 * Reçoit les publications depuis actu.html
 * ============================================================
 */

// 1. Réception des requêtes POST depuis actu.html
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

  // --- VÉRIFICATION DES UTILISATEURS AUTORISÉS ---
  var authCheck = verifyUserPermission(ss, data.userEmail, data.secretCode);
  if (!authCheck.authorized) {
    return {
      success: false,
      message: authCheck.message
    };
  }

  // --- ACCÈS À L'ONGLET ACTUALITÉS ---
  var sheet = ss.getSheetByName("Actualités") || ss.getSheetByName("Actualites") || ss.getSheets()[0];
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

  // Upload photo sur Google Drive si envoyée en fichier
  var finalImageUrl = (data.imageUrl || "").trim();
  if (data.imageBase64 && data.imageName) {
    finalImageUrl = saveImageToDrive(data.imageBase64, data.imageName, data.imageType);
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

  // Ajout de la nouvelle ligne
  sheet.appendRow(newRow);

  return {
    success: true,
    message: "Article « " + data.titre + " » publié avec succès !"
  };
}

// 4. Vérification de permission dans l'onglet "access" ou "actu_authorization"
function verifyUserPermission(ss, email, secretCode) {
  var userSheet = ss.getSheetByName("access") || 
                  ss.getSheetByName("actu_authorization") || 
                  ss.getSheetByName("Utilisateurs") || 
                  ss.getSheetByName("Enseignants");
  
  // Si aucun onglet d'autorisation n'existe encore, autoriser par défaut
  if (!userSheet) {
    return { authorized: true };
  }

  var data = userSheet.getDataRange().getValues();
  if (data.length === 0) {
    return { authorized: true };
  }

  var cleanEmail = (email || "").trim().toLowerCase();
  var cleanCode = (secretCode || "").trim();

  // 1. Vérification du mot de passe de secours (partout dans la ligne 1 ou cellule B1)
  for (var c = 0; c < data[0].length; c++) {
    var cellVal = (data[0][c] || "").toString().trim();
    if (cellVal && cleanCode && cellVal === cleanCode) {
      return { authorized: true };
    }
  }

  // 2. Vérification de l'email parmi la liste des adresses autorisées
  if (cleanEmail) {
    for (var r = 0; r < data.length; r++) {
      for (var col = 0; col < data[r].length; col++) {
        var val = (data[r][col] || "").toString().trim().toLowerCase();
        if (val === cleanEmail) {
          return { authorized: true };
        }
      }
    }
  }

  return {
    authorized: false,
    message: "Accès refusé : L'adresse « " + (email || "non renseignée") + " » ou le mot de passe ne correspondent pas aux accès enregistrés dans l'onglet access du Sheet."
  };
}

// 5. Sauvegarde d'image dans un dossier Google Drive partagé
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

    return "https://lh3.googleusercontent.com/d/" + file.getId();
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
