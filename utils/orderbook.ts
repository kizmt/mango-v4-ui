import {
  BookSide,
  BookSideType,
  MangoClient,
  PerpMarket,
} from '@blockworks-foundation/mango-v4'
import { Market, Orderbook as SpotOrderBook } from '@project-serum/serum'
import { AccountInfo } from '@solana/web3.js'
import mangoStore from '@store/mangoStore'
import Big from 'big.js'
import { cumOrderbookSide } from 'types'
import { getDecimalCount } from './numbers'

export const getMarket = () => {
  const group = mangoStore.getState().group
  const selectedMarket = mangoStore.getState().selectedMarket.current
  if (!group || !selectedMarket) return
  return selectedMarket instanceof PerpMarket
    ? selectedMarket
    : group?.getSerum3ExternalMarket(selectedMarket.serumMarketExternal)
}

export const decodeBookL2 = (book: SpotOrderBook | BookSide): number[][] => {
  const depth = 300
  if (book instanceof SpotOrderBook) {
    return book.getL2(depth).map(([price, size]) => [price, size])
  } else if (book instanceof BookSide) {
    return book.getL2Ui(depth)
  }
  return []
}

export function decodeBook(
  client: MangoClient,
  market: Market | PerpMarket,
  accInfo: AccountInfo<Buffer>,
  side: 'bids' | 'asks'
): SpotOrderBook | BookSide {
  if (market instanceof Market) {
    const book = SpotOrderBook.decode(market, accInfo.data)
    return book
  } else {
    const decodedAcc = client.program.coder.accounts.decode(
      'bookSide',
      accInfo.data
    )
    const book = BookSide.from(
      client,
      market,
      side === 'bids' ? BookSideType.bids : BookSideType.asks,
      decodedAcc
    )
    return book
  }
}

export const updatePerpMarketOnGroup = (
  book: BookSide,
  side: 'bids' | 'asks'
) => {
  const group = mangoStore.getState().group
  const perpMarket = group?.getPerpMarketByMarketIndex(
    book.perpMarket.perpMarketIndex
  )
  if (perpMarket) {
    perpMarket[`_${side}`] = book
    // mangoStore.getState().actions.fetchOpenOrders()
  }
}

export const hasOpenOrderForPriceGroup = (
  openOrderPrices: number[],
  price: number,
  grouping: number,
  isGrouped: boolean
) => {
  if (!isGrouped) {
    return !!openOrderPrices.find((ooPrice) => {
      return ooPrice === price
    })
  }
  return !!openOrderPrices.find((ooPrice) => {
    return ooPrice >= price - grouping && ooPrice <= price + grouping
  })
}

export const getCumulativeOrderbookSide = (
  orders: number[][],
  totalSize: number,
  maxSize: number,
  depth: number,
  usersOpenOrderPrices: number[],
  grouping: number,
  isGrouped: boolean
): cumOrderbookSide[] => {
  let cumulativeSize = 0
  return orders.slice(0, depth).map(([price, size]) => {
    cumulativeSize += size
    return {
      price: Number(price),
      size,
      cumulativeSize,
      sizePercent: Math.round((cumulativeSize / (totalSize || 1)) * 100),
      cumulativeSizePercent: Math.round((size / (cumulativeSize || 1)) * 100),
      maxSizePercent: Math.round((size / (maxSize || 1)) * 100),
      isUsersOrder: hasOpenOrderForPriceGroup(
        usersOpenOrderPrices,
        price,
        grouping,
        isGrouped
      ),
    }
  })
}

export const groupBy = (
  ordersArray: number[][],
  market: PerpMarket | Market,
  grouping: number,
  isBids: boolean
) => {
  if (!ordersArray || !market || !grouping || grouping == market?.tickSize) {
    return ordersArray || []
  }
  const groupFloors: Record<number, number> = {}
  for (let i = 0; i < ordersArray.length; i++) {
    if (typeof ordersArray[i] == 'undefined') {
      break
    }
    const bigGrouping = Big(grouping)
    const bigOrder = Big(ordersArray[i][0])

    const floor = isBids
      ? bigOrder
          .div(bigGrouping)
          .round(0, Big.roundDown)
          .times(bigGrouping)
          .toNumber()
      : bigOrder
          .div(bigGrouping)
          .round(0, Big.roundUp)
          .times(bigGrouping)
          .toNumber()
    if (typeof groupFloors[floor] == 'undefined') {
      groupFloors[floor] = ordersArray[i][1]
    } else {
      groupFloors[floor] = ordersArray[i][1] + groupFloors[floor]
    }
  }
  const sortedGroups = Object.entries(groupFloors)
    .map((entry) => {
      return [
        +parseFloat(entry[0]).toFixed(getDecimalCount(grouping)),
        entry[1],
      ]
    })
    .sort((a: number[], b: number[]) => {
      if (!a || !b) {
        return -1
      }
      return isBids ? b[0] - a[0] : a[0] - b[0]
    })
  return sortedGroups
}
