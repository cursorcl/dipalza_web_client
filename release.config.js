module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: false }],
    ['@semantic-release/git', {
      assets: ['package.json', 'package-lock.json', 'CHANGELOG.md'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }],
    '@semantic-release/github',
    ['@semantic-release/exec', {
      // Dispara la actualizacion del frontend embebido en dipalza_server.
      // successCmd solo corre cuando semantic-release efectivamente publico
      // una version nueva (no en ejecuciones sin cambios releasables).
      // GH_TOKEN se pasa inline (no via env global del step) para no pisar
      // el GITHUB_TOKEN que usa @semantic-release/github sobre este mismo repo.
      successCmd: 'GH_TOKEN=$DISPATCH_TOKEN gh api repos/cursorcl/dipalza_server/actions/workflows/sync-frontend.yml/dispatches -X POST -f ref=main -f "inputs[web_client_version]=v${nextRelease.version}"'
    }]
  ]
};
