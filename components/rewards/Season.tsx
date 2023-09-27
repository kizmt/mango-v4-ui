import Select from '@components/forms/Select'
import AcornIcon from '@components/icons/AcornIcon'
import MangoIcon from '@components/icons/MangoIcon'
import RobotIcon from '@components/icons/RobotIcon'
import WhaleIcon from '@components/icons/WhaleIcon'
import Button from '@components/shared/Button'
import SheenLoader from '@components/shared/SheenLoader'
import { ClockIcon } from '@heroicons/react/20/solid'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import useMangoAccount from 'hooks/useMangoAccount'
import {
  useCurrentSeason,
  useAccountTier,
  useWalletPoints,
  useTopAccountsLeaderBoard,
} from 'hooks/useRewards'
import { RefObject, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { abbreviateAddress } from 'utils/formatting'
import { formatNumericValue } from 'utils/numbers'
import { tiers } from './RewardsPage'
import RewardsTierCard from './RewardsTierCard'
import Faqs from './Faqs'
import dayjs from 'dayjs'
import MedalIcon from '@components/icons/MedalIcon'

const Season = ({
  faqRef,
  setShowLeaderboards,
}: {
  faqRef: RefObject<HTMLDivElement>
  setShowLeaderboards: (x: string) => void
}) => {
  const { t } = useTranslation(['common', 'rewards'])
  const { wallet } = useWallet()
  const [topAccountsTier, setTopAccountsTier] = useState('mango')
  const { mangoAccountAddress } = useMangoAccount()
  const { data: seasonData } = useCurrentSeason()
  const { data: accountTier } = useAccountTier(
    mangoAccountAddress,
    seasonData?.season_id,
  )
  const {
    data: walletPoints,
    isFetching: fetchingWalletRewardsData,
    isLoading: loadingWalletRewardsData,
    refetch,
  } = useWalletPoints(mangoAccountAddress, seasonData?.season_id, wallet)
  const seasonEndsIn = dayjs(seasonData?.season_end).diff(new Date(), 'days')

  const {
    data: topAccountsLeaderboardData,
    isFetching: fetchingTopAccountsLeaderboardData,
    isLoading: loadingTopAccountsLeaderboardData,
  } = useTopAccountsLeaderBoard(seasonData?.season_id)

  const leadersForTier =
    topAccountsLeaderboardData?.find((x) => x.tier === topAccountsTier)
      ?.leaderboard || []

  const isLoadingWalletData =
    fetchingWalletRewardsData || loadingWalletRewardsData

  const isLoadingLeaderboardData =
    fetchingTopAccountsLeaderboardData || loadingTopAccountsLeaderboardData

  useEffect(() => {
    if (mangoAccountAddress) {
      refetch()
    }
  }, [mangoAccountAddress])

  return (
    <>
      <div className="flex items-center justify-center border-t border-th-bkg-3 pt-8">
        <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-red-400 px-4 py-2">
          <ClockIcon className="mr-2 h-5 w-5 text-black" />
          <p className="font-rewards text-lg text-black">
            Season {seasonData?.season_id} ends in:{' '}
            <span>{seasonEndsIn} days</span>
          </p>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1140px] grid-cols-12 gap-4 p-8 pt-0 lg:p-10">
        <div className="order-2 col-span-12 lg:order-1 lg:col-span-7">
          <div className="mb-4 rounded-2xl border border-th-bkg-3 p-6 pb-0">
            <h2 className="rewards-h2 mb-4">Rewards Tiers</h2>
            <div className="mb-6 space-y-2">
              <RewardsTierCard
                icon={<AcornIcon className="h-8 w-8 text-th-fgd-1" />}
                name="seed"
                desc="All new participants start here"
                setShowLeaderboards={setShowLeaderboards}
                status={
                  accountTier?.mango_account === 'seed' ? 'Your Tier' : ''
                }
              />
              <RewardsTierCard
                icon={<MangoIcon className="h-8 w-8 text-th-fgd-1" />}
                name="mango"
                desc="Average swap/trade value less than $1,000"
                setShowLeaderboards={setShowLeaderboards}
                status={
                  accountTier?.mango_account === 'mango' ? 'Your Tier' : ''
                }
              />
              <RewardsTierCard
                icon={<WhaleIcon className="h-8 w-8 text-th-fgd-1" />}
                name="whale"
                desc="Average swap/trade value greater than $1,000"
                setShowLeaderboards={setShowLeaderboards}
                status={
                  accountTier?.mango_account === 'whale' ? 'Your Tier' : ''
                }
              />
              <RewardsTierCard
                icon={<RobotIcon className="h-8 w-8 text-th-fgd-1" />}
                name="bot"
                desc="All bots"
                setShowLeaderboards={setShowLeaderboards}
                status={accountTier?.mango_account === 'bot' ? 'Your Tier' : ''}
              />
            </div>
          </div>
          <div ref={faqRef}>
            <Faqs />
          </div>
        </div>
        <div className="order-1 col-span-12 lg:order-2 lg:col-span-5">
          <div className="mb-4 rounded-2xl border border-th-bkg-3 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="rewards-h2">Your Points</h2>
              {/* {isWhiteListed ? (
                <Badge
                  label="Whitelisted"
                  borderColor="var(--success)"
                  shadowColor="var(--success)"
                />
              ) : null} */}
            </div>
            <div className="mb-4 flex h-14 w-full items-center rounded-xl bg-th-bkg-2 px-3">
              <span className="-mb-1 w-full font-rewards text-5xl text-th-fgd-1">
                {!isLoadingWalletData ? (
                  walletPoints ? (
                    formatNumericValue(walletPoints)
                  ) : wallet?.adapter.publicKey ? (
                    0
                  ) : (
                    <span className="flex items-center justify-center text-center font-body text-sm text-th-fgd-3">
                      {t('connect-wallet')}
                    </span>
                  )
                ) : (
                  <SheenLoader>
                    <div className="h-8 w-32 rounded-md bg-th-bkg-3" />
                  </SheenLoader>
                )}
              </span>
            </div>
            <div className="border-b border-th-bkg-3">
              <div className="flex items-center justify-between border-t border-th-bkg-3 px-3 py-2">
                <p className="rewards-p">Points Earned</p>
                <p className="font-rewards text-lg text-th-active">
                  {!isLoadingWalletData ? (
                    walletPoints ? (
                      formatNumericValue(walletPoints)
                    ) : wallet?.adapter.publicKey ? (
                      0
                    ) : (
                      '–'
                    )
                  ) : (
                    <SheenLoader>
                      <div className="h-4 w-12 rounded-sm bg-th-bkg-3" />
                    </SheenLoader>
                  )}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-th-bkg-3 px-3 py-2">
                <p className="rewards-p">Streak Bonus</p>
                <p className="font-rewards text-lg text-th-active">0x</p>
              </div>
              <div className="flex items-center justify-between border-t border-th-bkg-3 px-3 py-2">
                <p className="rewards-p">Rewards Tier</p>
                <p className="font-rewards text-lg text-th-active">
                  {!isLoadingWalletData ? (
                    accountTier?.mango_account ? (
                      <span className="capitalize">
                        {accountTier?.mango_account}
                      </span>
                    ) : (
                      '–'
                    )
                  ) : (
                    <SheenLoader>
                      <div className="h-4 w-12 rounded-sm bg-th-bkg-3" />
                    </SheenLoader>
                  )}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-th-bkg-3 px-3 py-2">
                <p className="rewards-p">Rank</p>
                <p className="font-rewards text-lg text-th-active">–</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-th-bkg-3 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="rewards-h2">Top Accounts</h2>
              <Select
                value={t(`rewards:${topAccountsTier}`)}
                onChange={(tier) => setTopAccountsTier(tier)}
              >
                {tiers.map((tier) => (
                  <Select.Option key={tier} value={tier}>
                    <div className="flex w-full items-center justify-between">
                      {t(`rewards:${tier}`)}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div className="mb-6 border-b border-th-bkg-3">
              {!isLoadingLeaderboardData ? (
                leadersForTier && leadersForTier.length ? (
                  leadersForTier.slice(0, 5).map((user, i: number) => {
                    const rank = i + 1
                    return (
                      <div
                        className="flex items-center justify-between border-t border-th-bkg-3 p-3"
                        key={i + user.mango_account}
                      >
                        <div className="flex items-center space-x-2 font-mono">
                          <div
                            className={`relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                              rank < 4 ? '' : 'bg-th-bkg-3'
                            }`}
                          >
                            <p
                              className={`relative z-10 font-rewards text-base ${
                                rank < 4 ? 'text-th-bkg-1' : 'text-th-fgd-1'
                              }`}
                            >
                              {rank}
                            </p>
                            {rank < 4 ? (
                              <MedalIcon className="absolute" rank={rank} />
                            ) : null}
                          </div>
                          <span className="text-th-fgd-3">
                            {abbreviateAddress(
                              new PublicKey(user.mango_account),
                            )}
                          </span>
                        </div>
                        <span className="font-mono text-th-fgd-1">
                          {formatNumericValue(user.total_points, 0)}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex justify-center border-t border-th-bkg-3 py-4">
                    <span className="text-th-fgd-3">
                      Leaderboard not available
                    </span>
                  </div>
                )
              ) : (
                <div className="space-y-0.5">
                  {[...Array(5)].map((x, i) => (
                    <SheenLoader className="flex flex-1" key={i}>
                      <div className="h-10 w-full bg-th-bkg-2" />
                    </SheenLoader>
                  ))}
                </div>
              )}
            </div>
            <Button
              className="raised-button w-full font-rewards"
              onClick={() => setShowLeaderboards(topAccountsTier)}
            >
              <span className="mt-1.5 text-xl">Full Leaderboard</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Season