import { ethers } from 'hardhat'

export async function fundAccount(account: string) {
  const response = await fetch('https://faucet.rollup.silentdata.com/api/faucet/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: account,
      rpcUrl: process.env.RPC_URL,
    }),
  })

  if (!response.ok) {
    // Bail out if the request failed
    console.error('Failed to fund account:', response.statusText)
    return
  }

  const { transactionHash } = await response.json()

  if (!transactionHash) return

  // Wait for the transaction to be mined
  for (let i = 0; i < 20; i++) {
    try {
      const receipt = await ethers.provider.getTransactionReceipt(transactionHash)
      if (receipt) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch {
      // TODO: Fix this
      // Method getTransactionReceipt will throw an error when transaction is mined due to invalid parameters in the receipt
      return
    }
  }
}
