module.exports = {
  packagerConfig: {
    asar: true,
    icon: './resources/icon',
    extraResource: [
      './target/release/unitodo'
    ],
    osxSign: {},
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Unitodo',
        icon: './resources/icon.icns',
        background: './resources/background.png',
        format: 'ULFO'
      }
    }
  ],
  publishers: []
};
