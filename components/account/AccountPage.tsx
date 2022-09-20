import {
  HealthType,
  I80F48,
  toUiDecimalsForQuote,
  ZERO_I80F48,
} from '@blockworks-foundation/mango-v4'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useMemo, useState } from 'react'
import AccountActions from './AccountActions'
import DepositModal from '../modals/DepositModal'
import WithdrawModal from '../modals/WithdrawModal'
import mangoStore, { PerformanceDataItem } from '@store/mangoStore'
import { formatDecimal, formatFixedDecimals } from '../../utils/numbers'
import FlipNumbers from 'react-flip-numbers'
import { DownTriangle, UpTriangle } from '../shared/DirectionTriangles'
import SimpleAreaChart from '../shared/SimpleAreaChart'
import { COLORS } from '../../styles/colors'
import { useTheme } from 'next-themes'
import { IconButton } from '../shared/Button'
import {
  ArrowsPointingOutIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid'
import { Transition } from '@headlessui/react'
import AccountTabs from './AccountTabs'
import SheenLoader from '../shared/SheenLoader'
import AccountChart from './AccountChart'
import { useViewport } from '../../hooks/useViewport'
import { breakpoints } from '../../utils/theme'
import useMangoAccount from '../shared/useMangoAccount'
import PercentageChange from '../shared/PercentageChange'
import Tooltip from '@components/shared/Tooltip'

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        'common',
        'close-account',
        'trade',
      ])),
    },
  }
}

const AccountPage = () => {
  const { t } = useTranslation('common')
  const { mangoAccount, lastUpdatedAt } = useMangoAccount()
  const actions = mangoStore((s) => s.actions)
  const loadPerformanceData = mangoStore(
    (s) => s.mangoAccount.stats.performance.loading
  )
  const performanceData = mangoStore(
    (s) => s.mangoAccount.stats.performance.data
  )
  const totalInterestData = mangoStore(
    (s) => s.mangoAccount.stats.interestTotals.data
  )
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false)
  const [chartToShow, setChartToShow] = useState<
    'account-value' | 'cumulative-interest-value' | 'pnl' | ''
  >('')
  const [oneDayPerformanceData, setOneDayPerformanceData] = useState<
    PerformanceDataItem[]
  >([])
  const [showExpandChart, setShowExpandChart] = useState<boolean>(false)
  const { theme } = useTheme()
  const { width } = useViewport()
  const isMobile = width ? width < breakpoints.md : false

  useEffect(() => {
    if (mangoAccount) {
      const pubKey = mangoAccount.publicKey.toString()
      actions.fetchAccountPerformance(pubKey, 1)
      actions.fetchAccountInterestTotals(pubKey)
    }
  }, [actions, mangoAccount])

  useEffect(() => {
    if (!oneDayPerformanceData.length && performanceData.length) {
      setOneDayPerformanceData(performanceData)
    }
  }, [oneDayPerformanceData, performanceData])

  const onHoverMenu = (open: boolean, action: string) => {
    if (
      (!open && action === 'onMouseEnter') ||
      (open && action === 'onMouseLeave')
    ) {
      setShowExpandChart(!open)
    }
  }

  const handleShowAccountValueChart = () => {
    setChartToShow('account-value')
    setShowExpandChart(false)
  }

  const handleHideChart = () => {
    const set = mangoStore.getState().set
    set((s) => {
      s.mangoAccount.stats.performance.data = oneDayPerformanceData
    })
    setChartToShow('')
  }

  const { accountPnl, accountValueChange } = useMemo(() => {
    if (performanceData.length && mangoAccount) {
      return {
        accountPnl: performanceData[performanceData.length - 1].pnl,
        accountValueChange:
          ((toUiDecimalsForQuote(mangoAccount.getEquity()!.toNumber()) -
            performanceData[0].account_equity) /
            performanceData[0].account_equity) *
          100,
      }
    }
    return { accountPnl: 0, accountValueChange: 0 }
  }, [performanceData, mangoAccount])

  const interestTotalValue = useMemo(() => {
    if (totalInterestData.length) {
      return totalInterestData.reduce(
        (a, c) => a + c.borrow_interest_usd + c.deposit_interest_usd,
        0
      )
    }
    return 0
  }, [totalInterestData])

  const maintHealth = useMemo(() => {
    return mangoAccount ? mangoAccount.getHealthRatioUi(HealthType.maint) : 0
  }, [mangoAccount])

  return !chartToShow ? (
    <>
      <div className="flex flex-wrap items-center justify-between border-b-0 border-th-bkg-3 px-6 pt-3 pb-0 md:border-b md:pb-3">
        <div className="flex items-center space-x-6">
          <div id="step-two">
            <Tooltip
              maxWidth="20rem"
              placement="bottom"
              content="The value of your assets (deposits) minus the value of your liabilities (borrows)."
            >
              <p className="tooltip-underline mb-1.5">{t('account-value')}</p>
            </Tooltip>
            <div className="mb-1 flex items-center text-5xl font-bold text-th-fgd-1">
              $
              {mangoAccount ? (
                <FlipNumbers
                  height={48}
                  width={32}
                  play
                  delay={0.05}
                  duration={1}
                  numbers={formatDecimal(
                    toUiDecimalsForQuote(mangoAccount.getEquity()!.toNumber()),
                    2
                  )}
                />
              ) : (
                <FlipNumbers
                  height={48}
                  width={32}
                  play
                  delay={0.05}
                  duration={1}
                  numbers={'0.00'}
                />
              )}
            </div>
            <PercentageChange change={accountValueChange} />
          </div>
          {!loadPerformanceData ? (
            mangoAccount && performanceData.length ? (
              <div
                className="relative flex items-end"
                onMouseEnter={() =>
                  onHoverMenu(showExpandChart, 'onMouseEnter')
                }
                onMouseLeave={() =>
                  onHoverMenu(showExpandChart, 'onMouseLeave')
                }
              >
                <SimpleAreaChart
                  color={
                    accountValueChange >= 0
                      ? COLORS.GREEN[theme]
                      : COLORS.RED[theme]
                  }
                  data={performanceData}
                  height={88}
                  name="accountValue"
                  width={180}
                  xKey="time"
                  yKey="account_equity"
                />
                <Transition
                  appear={true}
                  className="absolute right-2 bottom-2"
                  show={showExpandChart}
                  enter="transition ease-in duration-300"
                  enterFrom="opacity-0 scale-75"
                  enterTo="opacity-100 scale-100"
                  leave="transition ease-out duration-200"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <IconButton
                    className="text-th-fgd-3"
                    hideBg
                    onClick={() => handleShowAccountValueChart()}
                  >
                    <ArrowsPointingOutIcon className="h-5 w-5" />
                  </IconButton>
                </Transition>
              </div>
            ) : null
          ) : (
            <SheenLoader>
              <div className="h-[88px] w-[180px] rounded-md bg-th-bkg-2" />
            </SheenLoader>
          )}
        </div>
        <div className="my-3 lg:my-0">
          <AccountActions />
        </div>
      </div>
      <div className="grid grid-cols-4 border-b border-th-bkg-3">
        <div className="col-span-4 border-t border-th-bkg-3 py-3 pl-6 md:col-span-1 md:col-span-2 md:border-l md:border-t-0 lg:col-span-1">
          <div id="step-three">
            <Tooltip
              maxWidth="20rem"
              placement="bottom"
              content={
                <div className="flex-col space-y-2 text-sm">
                  <p className="text-xs">
                    Health describes how close your account is to liquidation.
                    The lower your account health is the more likely you are to
                    get liquidated when prices fluctuate.
                  </p>
                  <p className="text-xs font-bold text-th-fgd-1">
                    Your account health is {maintHealth}%
                  </p>
                  <p className="text-xs">
                    <span className="font-bold text-th-fgd-1">Scenario:</span>{' '}
                    If the prices of all your liabilities increase by{' '}
                    {maintHealth}%, even for just a moment, some of your
                    liabilities will be liquidated.
                  </p>
                  <p className="text-xs">
                    <span className="font-bold text-th-fgd-1">Scenario:</span>{' '}
                    If the value of your total collateral decreases by{' '}
                    {((1 - 1 / ((maintHealth || 0) / 100 + 1)) * 100).toFixed(
                      2
                    )}
                    % , some of your liabilities will be liquidated.
                  </p>
                  <p className="text-xs">
                    These are examples. A combination of events can also lead to
                    liquidation.
                  </p>
                </div>
              }
            >
              <p className="tooltip-underline text-th-fgd-3">{t('health')}</p>
            </Tooltip>
            <p className="mt-1 text-2xl font-bold text-th-fgd-1">
              {maintHealth}%
            </p>
          </div>
        </div>
        <div className="col-span-4 border-t border-th-bkg-3 py-3 pl-6 md:col-span-1 md:col-span-2 md:border-l md:border-t-0 lg:col-span-1">
          <div id="step-four">
            <Tooltip
              content="The amount of capital you have to trade or borrow against. When your free collateral reaches $0 you won't be able to make withdrawals."
              maxWidth="20rem"
              placement="bottom"
            >
              <p className="tooltip-underline text-th-fgd-3">
                {t('free-collateral')}
              </p>
            </Tooltip>
            <p className="mt-1 text-2xl font-bold text-th-fgd-1">
              {mangoAccount
                ? formatFixedDecimals(
                    toUiDecimalsForQuote(
                      mangoAccount.getCollateralValue()!.toNumber()
                    ),
                    true
                  )
                : (0).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="col-span-4 flex items-center justify-between border-t border-th-bkg-3 py-3 px-6 md:col-span-2 md:col-span-2 md:border-l lg:col-span-1 lg:border-t-0">
          <div>
            <Tooltip
              content="The amount your account has made or lost."
              placement="bottom"
            >
              <p className="tooltip-underline text-th-fgd-3">{t('pnl')}</p>
            </Tooltip>
            <p className="mt-1 text-2xl font-bold text-th-fgd-1">
              {formatFixedDecimals(accountPnl, true)}
            </p>
          </div>
          {performanceData.length > 4 ? (
            <IconButton
              onClick={() => setChartToShow('pnl')}
              size={!isMobile ? 'small' : 'medium'}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </IconButton>
          ) : null}
        </div>
        <div className="col-span-4 flex items-center justify-between border-t border-th-bkg-3 py-3 pl-6 md:col-span-1 md:col-span-2 md:border-l lg:col-span-1 lg:border-t-0">
          <div id="step-five">
            <Tooltip
              content="The value of interest earned (deposits) minus interest paid (borrows)."
              maxWidth="20rem"
              placement="bottom"
            >
              <p className="tooltip-underline text-th-fgd-3">
                {t('total-interest-value')}
              </p>
            </Tooltip>
            <p className="mt-1 text-2xl font-bold text-th-fgd-1">
              {formatFixedDecimals(interestTotalValue, true)}
            </p>
          </div>
          {interestTotalValue > 1 || interestTotalValue < -1 ? (
            <IconButton
              onClick={() => setChartToShow('cumulative-interest-value')}
              size={!isMobile ? 'small' : 'medium'}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </IconButton>
          ) : null}
        </div>
      </div>
      <AccountTabs />
      {showDepositModal ? (
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
        />
      ) : null}
      {showWithdrawModal ? (
        <WithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
        />
      ) : null}
    </>
  ) : (
    <div className="p-6">
      {chartToShow === 'account-value' ? (
        <AccountChart
          chartToShow="account-value"
          data={performanceData}
          hideChart={handleHideChart}
          mangoAccount={mangoAccount!}
          yKey="account_equity"
        />
      ) : chartToShow === 'pnl' ? (
        <AccountChart
          chartToShow="pnl"
          data={performanceData}
          hideChart={handleHideChart}
          mangoAccount={mangoAccount!}
          yKey="pnl"
        />
      ) : (
        <AccountChart
          chartToShow="cumulative-interest-value"
          data={performanceData.map((d) => ({
            interest_value:
              d.borrow_interest_cumulative_usd +
              d.deposit_interest_cumulative_usd,
            time: d.time,
          }))}
          hideChart={handleHideChart}
          mangoAccount={mangoAccount!}
          yKey="interest_value"
        />
      )}
    </div>
  )
}

export default AccountPage
