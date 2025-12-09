const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../packages/decap-cms-locales/src');

// Translations for the three new keys
const translations = {
  en: {
    noEntriesInFolder: 'No entries found in this folder',
    folderRenamed: 'Folder renamed successfully',
    folderRenameNotSupported: 'Folder rename is not supported by this backend',
  },
  de: {
    noEntriesInFolder: 'Keine Einträge in diesem Ordner gefunden',
    folderRenamed: 'Ordner erfolgreich umbenannt',
    folderRenameNotSupported: 'Ordner umbenennen wird von diesem Backend nicht unterstützt',
  },
  es: {
    noEntriesInFolder: 'No se encontraron entradas en esta carpeta',
    folderRenamed: 'Carpeta renombrada exitosamente',
    folderRenameNotSupported: 'El renombrado de carpetas no es compatible con este backend',
  },
  fr: {
    noEntriesInFolder: 'Aucune entrée trouvée dans ce dossier',
    folderRenamed: 'Dossier renommé avec succès',
    folderRenameNotSupported: 'Le renommage de dossier n\'est pas pris en charge par ce backend',
  },
  it: {
    noEntriesInFolder: 'Nessuna voce trovata in questa cartella',
    folderRenamed: 'Cartella rinominata con successo',
    folderRenameNotSupported: 'La rinomina della cartella non è supportata da questo backend',
  },
  pt: {
    noEntriesInFolder: 'Nenhuma entrada encontrada nesta pasta',
    folderRenamed: 'Pasta renomeada com sucesso',
    folderRenameNotSupported: 'A renomeação de pasta não é suportada por este backend',
  },
  nl: {
    noEntriesInFolder: 'Geen items gevonden in deze map',
    folderRenamed: 'Map succesvol hernoemd',
    folderRenameNotSupported: 'Map hernoemen wordt niet ondersteund door deze backend',
  },
  ja: {
    noEntriesInFolder: 'このフォルダにエントリが見つかりません',
    folderRenamed: 'フォルダ名が正常に変更されました',
    folderRenameNotSupported: 'このバックエンドではフォルダ名の変更はサポートされていません',
  },
  ru: {
    noEntriesInFolder: 'В этой папке не найдено записей',
    folderRenamed: 'Папка успешно переименована',
    folderRenameNotSupported: 'Переименование папок не поддерживается этим бэкендом',
  },
  zh_Hans: {
    noEntriesInFolder: '此文件夹中未找到条目',
    folderRenamed: '文件夹重命名成功',
    folderRenameNotSupported: '此后端不支持文件夹重命名',
  },
  zh_Hant: {
    noEntriesInFolder: '此資料夾中未找到項目',
    folderRenamed: '資料夾重新命名成功',
    folderRenameNotSupported: '此後端不支援資料夾重新命名',
  },
};

// Get all locale directories
const localeDirs = fs.readdirSync(localesDir).filter(file => {
  const fullPath = path.join(localesDir, file);
  return fs.statSync(fullPath).isDirectory();
});

console.log(`Found ${localeDirs.length} locale directories`);

localeDirs.forEach(locale => {
  const indexPath = path.join(localesDir, locale, 'index.js');
  
  if (!fs.existsSync(indexPath)) {
    console.log(`Skipping ${locale} - no index.js found`);
    return;
  }

  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Check if the keys already exist
  if (content.includes('folderRenamed:')) {
    console.log(`Skipping ${locale} - already has folderRenamed key`);
    return;
  }

  // Get translations for this locale, fallback to English
  const trans = translations[locale] || translations.en;
  
  // Find the toast section and add the new keys before the closing brace
  // Look for patterns like:
  // onBackendDown: '...',
  // },
  // or
  // onFailToAuth: '%{details}',
  // },
  
  const toastSectionRegex = /(toast:\s*\{[\s\S]*?)(onBackendDown:[\s\S]*?},|onLoggedOut:[\s\S]*?},|onFailToAuth:[\s\S]*?},)(\s*},)/;
  
  if (toastSectionRegex.test(content)) {
    content = content.replace(toastSectionRegex, (match, before, lastEntry, after) => {
      // Add the new keys before the closing brace
      const newKeys = `      noEntriesInFolder: '${trans.noEntriesInFolder}',
      folderRenamed: '${trans.folderRenamed}',
      folderRenameNotSupported: '${trans.folderRenameNotSupported}',`;
      
      return `${before}${lastEntry}\n${newKeys}${after}`;
    });
    
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log(`✓ Updated ${locale}`);
  } else {
    console.log(`✗ Could not find toast section in ${locale}`);
  }
});

console.log('\nDone!');
