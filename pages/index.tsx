import type { NextPage } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import AccountPage from '../components/account/AccountPage'

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

const Index: NextPage = () => {
  return (
    <div className="p-8 pb-20 md:p-12">
      <AccountPage />
    </div>
  )
}

export default Index
