const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGET_META_DATA_NAMES = [
  'com.google.firebase.messaging.default_notification_color',
  'com.google.firebase.messaging.default_notification_icon',
];

function addToolsReplace(manifestContent) {
  return TARGET_META_DATA_NAMES.reduce((content, name) => {
    const pattern = new RegExp(
      `<meta-data\\s+android:name="${name.replace(/\./g, '\\.')}"[^>]*?/>`,
    );

    return content.replace(pattern, (element) => {
      if (element.includes('tools:replace') || !element.includes('android:resource')) {
        return element;
      }

      return element.replace(/\s*\/>$/, ' tools:replace="android:resource"/>');
    });
  }, manifestContent);
}

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const manifestPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'AndroidManifest.xml',
      );

      const manifestContent = await fs.promises.readFile(manifestPath, 'utf8');
      const patchedContent = addToolsReplace(manifestContent);

      if (patchedContent !== manifestContent) {
        await fs.promises.writeFile(manifestPath, patchedContent, 'utf8');
      }

      return cfg;
    },
  ]);

module.exports.addToolsReplace = addToolsReplace;
