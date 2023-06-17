import ButtonGroup from '@components/forms/ButtonGroup'
import Decimal from 'decimal.js'
import { useEffect, useMemo, useState } from 'react'
import { floorToDecimal } from 'utils/numbers'
import { useTokenMax } from './useTokenMax'

const PercentageSelectButtons = ({
  amountIn,
  setAmountIn,
  useMargin,
}: {
  amountIn: string
  setAmountIn: (x: string) => void
  useMargin: boolean
}) => {
  const [sizePercentage, setSizePercentage] = useState('')
  const {
    amount: tokenMax,
    amountWithBorrow,
    decimals,
  } = useTokenMax(useMargin)

  const maxAmount = useMemo(() => {
    if (!tokenMax && !amountWithBorrow) return new Decimal(0)
    return useMargin ? amountWithBorrow : tokenMax
  }, [tokenMax, amountWithBorrow, useMargin])

  useEffect(() => {
    if (maxAmount.gt(0) && amountIn && maxAmount.eq(amountIn)) {
      setSizePercentage('100')
    }
  }, [amountIn, maxAmount])

  const handleSizePercentage = (percentage: string) => {
    setSizePercentage(percentage)
    if (maxAmount.gt(0)) {
      let amount = maxAmount.mul(percentage).div(100)
      if (percentage !== '100') {
        amount = floorToDecimal(amount, decimals)
      }
      setAmountIn(amount.toFixed())
    } else {
      setAmountIn('0')
    }
  }

  return (
    <ButtonGroup
      activeValue={sizePercentage}
      onChange={(p) => handleSizePercentage(p)}
      values={['10', '25', '50', '75', '100']}
      unit="%"
    />
  )
}

export default PercentageSelectButtons
