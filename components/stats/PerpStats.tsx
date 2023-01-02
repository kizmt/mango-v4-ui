import { useState } from 'react'
import PerpMarketDetails from './PerpMarketDetails'
import PerpMarketsTable from './PerpMarketsTable'

const PerpStats = () => {
  const [showPerpDetails, setShowPerpDetails] = useState('')
  return !showPerpDetails ? (
    <PerpMarketsTable setShowPerpDetails={setShowPerpDetails} />
  ) : (
    <PerpMarketDetails
      perpMarket={showPerpDetails}
      setShowPerpDetails={setShowPerpDetails}
    />
  )
}

export default PerpStats