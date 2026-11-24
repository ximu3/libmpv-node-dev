import { getClientApiVersion } from '@ximu3/libmpv-node'

const { major, minor } = await getClientApiVersion()
console.log(`libmpv Client API ${major}.${minor}`)
