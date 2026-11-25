import { copyFileSync, mkdirSync } from 'node:fs'
import metadata from '../../package.json' with { type: 'json' }
import { execFileSync } from 'node:child_process'

execFileSync('cargo', ['build', '--release', '--locked', '-p', 'libmpv-binding'], {
  env:
    process.platform === 'darwin'
      ? { ...process.env, MACOSX_DEPLOYMENT_TARGET: metadata.config.macosDeploymentTarget }
      : process.env,
  stdio: 'inherit',
})
const name = {
  win32: 'libmpv_binding.dll',
  linux: 'liblibmpv_binding.so',
  darwin: 'liblibmpv_binding.dylib',
}[process.platform as 'win32' | 'linux' | 'darwin']
mkdirSync('build/addon', { recursive: true })
copyFileSync('target/release/' + name, 'build/addon/libmpv.node')
