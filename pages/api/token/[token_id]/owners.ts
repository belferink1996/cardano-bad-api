import type { NextApiRequest, NextApiResponse } from 'next'
import blockfrost from '@/utils/blockfrost'
import type { Address } from '@/@types'

export const config = {
  api: {
    responseLimit: false,
  },
}

interface Owner {
  quantity: number
  stakeKey: string
  addresses: Address[]
}

export interface AssetOwnersResponse {
  tokenId: string
  page: number
  owners: Owner[]
}

const handler = async (req: NextApiRequest, res: NextApiResponse<AssetOwnersResponse>) => {
  const { method, query } = req

  const tokenId = query.token_id?.toString()
  const page = Number(query.page || 1)

  if (!tokenId) {
    return res.status(400).end()
  }

  try {
    switch (method) {
      case 'GET': {
        console.log('Fetching addresses:', tokenId)

        const assetAddresses = await blockfrost.assetsAddresses(tokenId, {
          count: 100,
          page,
          order: 'asc',
        })

        console.log('Fetched addresses:', assetAddresses.length)

        const payload: Owner[] = []

        for await (const { address, quantity } of assetAddresses) {
          console.log('Fetching wallet:', address)

          const wallet = await blockfrost.addresses(address)
          const stakeKey = wallet.stake_address || ''

          console.log('Fetched wallet:', stakeKey)

          payload.push({
            quantity: Number(quantity),
            stakeKey,
            addresses: [
              {
                address: wallet.address,
                isScript: wallet.script,
              },
            ],
          })
        }

        return res.status(200).json({
          tokenId,
          page,
          owners: payload,
        })
      }

      default: {
        res.setHeader('Allow', 'GET')
        return res.status(405).end()
      }
    }
  } catch (error: any) {
    console.error(error)

    if (
      ['The requested component has not been found.', 'Invalid or malformed asset format.'].includes(
        error?.message
      )
    ) {
      return res.status(404).end(`Token not found: ${tokenId}`)
    }

    return res.status(500).end()
  }
}

export default handler
