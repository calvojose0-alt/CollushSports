// Patches @capacitor-community/apple-sign-in Package.swift to accept
// capacitor-swift-pm 8.x (the plugin ships with an upper bound of 8.0.0
// which conflicts with Capacitor 8.x apps).
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(
  __dirname,
  '../node_modules/@capacitor-community/apple-sign-in/Package.swift'
)

try {
  let contents = readFileSync(pkgPath, 'utf8')
  const original = '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")'
  const patched  = '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", "7.0.0"..<"9.0.0")'

  if (contents.includes(original)) {
    contents = contents.replace(original, patched)
    writeFileSync(pkgPath, contents, 'utf8')
    console.log('✅ Patched apple-sign-in Package.swift for Capacitor 8 compatibility')
  } else if (contents.includes(patched)) {
    console.log('✅ apple-sign-in Package.swift already patched')
  } else {
    console.warn('⚠️  Could not find expected string in Package.swift — manual check needed')
  }
} catch (e) {
  console.error('❌ Patch failed:', e.message)
}
