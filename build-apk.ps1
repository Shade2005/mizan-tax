# Mizan UAE Tax - One-command local APK build script
Push-Location "$PSScriptRoot\mobile"
try {
    node scripts\build-apk.js $args
} finally {
    Pop-Location
}
