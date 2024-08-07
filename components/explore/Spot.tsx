import { ChangeEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/20/solid'
import useListedMarketsWithMarketData, {
  SerumMarketWithMarketData,
} from 'hooks/useListedMarketsWithMarketData'
import useMangoGroup from 'hooks/useMangoGroup'
import useBanks from 'hooks/useBanks'
import useLocalStorageState from 'hooks/useLocalStorageState'
import SpotTable from './SpotTable'
import ButtonGroup from '@components/forms/ButtonGroup'
import SpotCards from './SpotCards'
import Input from '@components/forms/Input'
import EmptyState from '@components/nftMarket/EmptyState'
import SheenLoader from '@components/shared/SheenLoader'
import { Bank } from '@blockworks-foundation/mango-v4'
import { TOKEN_REDUCE_ONLY_OPTIONS, TOKEN_WATCHLIST_KEY } from 'utils/constants'
import { DEFAULT_WATCHLIST } from './WatchlistButton'
import { AllowedKeys } from 'utils/markets'
import { useViewport } from 'hooks/useViewport'
import { IconButton } from '@components/shared/Button'

export type BankWithMarketData = {
  bank: Bank
  market: SerumMarketWithMarketData | undefined
}

const generateSearchTerm = (item: BankWithMarketData, searchValue: string) => {
  const normalizedSearchValue = searchValue.toLowerCase()
  const value = item.bank.name.toLowerCase()

  const isMatchingWithName = value.indexOf(normalizedSearchValue) >= 0
  const matchingSymbolPercent = isMatchingWithName
    ? normalizedSearchValue.length / item.bank.name.length
    : 0

  return {
    token: item,
    matchingIdx: value.indexOf(normalizedSearchValue),
    matchingSymbolPercent,
  }
}

const startSearch = (items: BankWithMarketData[], searchValue: string) => {
  return items
    .map((item) => generateSearchTerm(item, searchValue))
    .filter((item) => item.matchingIdx >= 0)
    .sort((i1, i2) => i1.matchingIdx - i2.matchingIdx)
    .sort((i1, i2) => i2.matchingSymbolPercent - i1.matchingSymbolPercent)
    .map((item) => item.token)
}

const sortTokens = (
  tokens: BankWithMarketData[],
  sortByKey: AllowedKeys,
  watchlist: number[],
) => {
  return tokens.sort((a: BankWithMarketData, b: BankWithMarketData) => {
    const aInWatchlist = watchlist.includes(a.bank.tokenIndex)
    const bInWatchlist = watchlist.includes(b.bank.tokenIndex)
    const aIsReduce = a.bank.reduceOnly === TOKEN_REDUCE_ONLY_OPTIONS.ENABLED
    const bIsReduce = b.bank.reduceOnly === TOKEN_REDUCE_ONLY_OPTIONS.ENABLED
    const aIsNoBorrow =
      a.bank.reduceOnly === TOKEN_REDUCE_ONLY_OPTIONS.NO_BORROWS
    const bIsNoBorrow =
      b.bank.reduceOnly === TOKEN_REDUCE_ONLY_OPTIONS.NO_BORROWS

    if (aInWatchlist && !bInWatchlist) return -1
    if (!aInWatchlist && bInWatchlist) return 1
    if (!aIsReduce && bIsReduce) return -1
    if (aIsReduce && !bIsReduce) return 1
    if (!aIsNoBorrow && bIsNoBorrow) return -1
    if (aIsNoBorrow && !bIsNoBorrow) return 1

    let aValue: number | undefined
    let bValue: number | undefined
    if (sortByKey === 'change_24h') {
      aValue = a?.market?.rollingChange
      bValue = b?.market?.rollingChange
    } else {
      aValue = a?.market?.marketData?.[sortByKey]
      bValue = b?.market?.marketData?.[sortByKey]
    }

    if (typeof aValue === 'undefined' && typeof bValue === 'undefined') return 0
    if (typeof aValue === 'undefined') return 1
    if (typeof bValue === 'undefined') return -1

    return bValue - aValue
  })
}

const Spot = () => {
  const [watchlist] = useLocalStorageState(
    TOKEN_WATCHLIST_KEY,
    DEFAULT_WATCHLIST,
  )
  const { t } = useTranslation(['common', 'explore', 'trade'])
  const { group } = useMangoGroup()
  const { banks } = useBanks()
  const { isDesktop } = useViewport()
  const { serumMarketsWithData, isLoading: loadingMarketsData } =
    useListedMarketsWithMarketData()
  const [sortByKey, setSortByKey] = useState<AllowedKeys>('quote_volume_24h')
  const [search, setSearch] = useState('')
  const [showTableView, setShowTableView] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const banksWithMarketData = useMemo(() => {
    if (!banks.length || !group || !serumMarketsWithData.length) return []
    const banksWithMarketData = []
    const usdcQuoteMarkets = serumMarketsWithData.filter(
      (market) => market.quoteTokenIndex === 0,
    )
    for (const bank of banks) {
      const market = usdcQuoteMarkets.find(
        (market) => market.baseTokenIndex === bank.tokenIndex,
      )
      if (market) {
        banksWithMarketData.push({ bank, market })
      } else {
        banksWithMarketData.push({ bank, market: undefined })
      }
    }
    return banksWithMarketData
  }, [banks, group, serumMarketsWithData])

  const sortedTokensToShow = useMemo(() => {
    if (!banksWithMarketData.length) return []
    return search
      ? startSearch(banksWithMarketData, search)
      : sortTokens(banksWithMarketData, sortByKey, watchlist)
  }, [search, banksWithMarketData, sortByKey, watchlist])

  const handleUpdateSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const currentTokensToShow = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedTokensToShow.slice(start, end)
  }, [sortedTokensToShow, currentPage])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  return (
    <div className="lg:-mt-10">
      <div className="flex flex-col px-4 md:px-6 lg:flex-row lg:items-center lg:justify-end 2xl:px-12">
        <div className="flex w-full flex-col md:w-auto md:flex-row md:space-x-3">
          <div className="relative mb-3 w-full md:mb-0 lg:w-40">
            <Input
              heightClass="h-10 pl-8"
              type="text"
              value={search}
              onChange={handleUpdateSearch}
            />
            <MagnifyingGlassIcon className="absolute left-2 top-3 h-4 w-4" />
          </div>
          <div className="flex space-x-3">
            {!showTableView || !isDesktop ? (
              <div className="w-full md:w-48">
                <ButtonGroup
                  activeValue={sortByKey}
                  onChange={(v) => setSortByKey(v)}
                  names={[t('trade:24h-volume'), t('rolling-change')]}
                  values={['quote_volume_24h', 'change_24h']}
                />
              </div>
            ) : null}
            <div className="flex">
              <button
                className={`flex w-10 items-center justify-center rounded-l-md border border-th-bkg-3 focus:outline-none md:hover:bg-th-bkg-3 ${
                  showTableView ? 'bg-th-bkg-3 text-th-active' : ''
                }`}
                onClick={() => setShowTableView(!showTableView)}
              >
                <TableCellsIcon className="h-5 w-5" />
              </button>
              <button
                className={`flex w-10 items-center justify-center rounded-r-md border border-th-bkg-3 focus:outline-none md:hover:bg-th-bkg-3 ${
                  !showTableView ? 'bg-th-bkg-3 text-th-active' : ''
                }`}
                onClick={() => setShowTableView(!showTableView)}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {loadingMarketsData ? (
        <div className="mx-4 my-6 space-y-1 md:mx-6">
          {[...Array(4)].map((x, i) => (
            <SheenLoader className="flex flex-1" key={i}>
              <div className="h-16 w-full bg-th-bkg-2" />
            </SheenLoader>
          ))}
        </div>
      ) : sortedTokensToShow.length ? (
        <>
          {showTableView ? (
            <div className="mt-6 border-t border-th-bkg-3">
              <SpotTable tokens={currentTokensToShow} />
            </div>
          ) : (
            <SpotCards tokens={currentTokensToShow} />
          )}
          <Pagination
            currentPage={currentPage}
            totalItems={sortedTokensToShow.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className="px-4 pt-2 md:px-6 2xl:px-12">
          <EmptyState text="No results found..." />
        </div>
      )}
    </div>
  )
}

export default Spot

type PaginationProps = {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handlePrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  }

  return (
    <div className="flex items-center justify-center space-x-3 py-4">
      <IconButton
        onClick={handlePrevPage}
        disabled={currentPage === 1}
        size="small"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </IconButton>
      <span className="text-th-fgd-3">
        {currentPage} of {totalPages}
      </span>
      <IconButton
        onClick={handleNextPage}
        disabled={currentPage === totalPages}
        size="small"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </IconButton>
    </div>
  )
}
