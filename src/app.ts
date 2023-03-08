import { MerkleAPIClient, User } from '@standard-crypto/farcaster-js'
import { Wallet } from 'ethers'
import inquirer from 'inquirer'

async function main() {
  console.log('Welcome to the Farcaster follow back script!')
  console.log('This script will follow back all users that follow you.')
  console.log(
    "Please, enter you seed phrase for the Farcaster wallet (make sure to check out the code in app.ts if you don't trust this script):"
  )
  const { seed } = await inquirer.prompt([
    {
      type: 'password',
      name: 'seed',
      message: 'Seed phrase:',
    },
  ])
  if (typeof seed !== 'string') {
    throw new Error('Seed is not a string')
  }
  const wallet = Wallet.fromMnemonic(seed)
  const client = new MerkleAPIClient(wallet)
  console.log(`Got wallet ${wallet.address}`)
  const { needRevoking } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'needRevoking',
      message: 'Do you need to revoke your auth tokens (probably no)?',
      default: false,
    },
  ])
  if (needRevoking) {
    console.log(
      'Creating 50 auth tokens that expire long time in the future...'
    )
    const tokens = await Promise.all(
      Array.from(Array(50).keys()).map(() =>
        // go for the a very big expiry to make sure they have longer expiry than all existing tokens
        client.createAuthToken(109999999999999)
      )
    )
    console.log(`Revoking ${tokens.length} tokens...`)
    await Promise.all(tokens.map((token) => client.revokeAuthToken(token)))
    console.log('Revoked all tokens!')
  }
  console.log(
    "Fetching users that you follow so that we don't follow them again..."
  )
  const following = [] as User[]
  const user = await client.fetchCurrentUser()
  console.log(`You are ${user.username ? `@${user.username}` : user.fid}`)
  for await (const follower of client.fetchUserFollowing(user)) {
    following.push(follower)
  }
  console.log(
    `You are following ${following.length} users, we fetched them all!`
  )
  console.log('Fetching users that follow you...')
  const followers = [] as User[]
  for await (const follower of client.fetchUserFollowers(user)) {
    followers.push(follower)
  }
  console.log(`You have ${followers.length} followers, we fetched them all!`)
  console.log('Following back all users that follow you...')
  let i = 0
  for (const follower of followers) {
    i++
    const name = follower.username ? `@${follower.username}` : follower.fid
    if (following.find((u) => u.fid === follower.fid)) {
      console.log(`(${i}/${followers.length}) You already follow ${name}`)
      continue
    }
    console.log(`(${i}/${followers.length}) Following ${name}...`)
    try {
      await client.followUser(follower)
    } catch (error) {
      console.error(
        `Error following ${name}!`,
        error instanceof Error ? error.message : error
      )
    }
  }
  console.log('Done!')
}

try {
  await main()
} catch (error) {
  console.error('error:', error instanceof Error ? error.message : error)
  console.log(error)
}
