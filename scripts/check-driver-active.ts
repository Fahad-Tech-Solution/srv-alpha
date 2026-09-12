import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI missing')
  await mongoose.connect(uri)

  const users = mongoose.connection.db!.collection('users')
  const target = await users.findOne({ email: /axfhousehold@gmail.com/i })
  console.log(
    'target',
    target
      ? {
          email: target.email,
          role: target.role,
          isActive: target.isActive,
          isActiveType: typeof target.isActive,
          applicationStatus: target.applicationStatus,
          passwordSetupPending: target.passwordSetupPending,
          name: target.name,
        }
      : null
  )

  const inactive = await users
    .find({ role: 'driver', isActive: false })
    .project({ email: 1, isActive: 1, applicationStatus: 1, name: 1 })
    .toArray()
  console.log('inactiveDrivers', inactive.length, inactive)

  const active = await users.countDocuments({ role: 'driver', isActive: true })
  console.log('activeDrivers', active)

  const truthyStrings = await users
    .find({ role: 'driver', isActive: { $in: ['false', 'true', 0, 1] as any } })
    .project({ email: 1, isActive: 1 })
    .toArray()
  console.log('weirdIsActive', truthyStrings)

  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
