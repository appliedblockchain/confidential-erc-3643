export function exportAccounts(
  accounts: Record<string, { address: string; privateKey?: string }>,
  exportPrivateKey = false,
) {
  return Object.entries(accounts)
    .filter(([_, account]) => account.address)
    .map(([name, account]) => {
      return {
        [name]: {
          address: account.address,
          ...(exportPrivateKey && { privateKey: account.privateKey }),
        },
      }
    })
}
