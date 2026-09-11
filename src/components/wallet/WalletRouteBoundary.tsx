import { Component, type ReactNode } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { reportBoundaryError } from '@/lib/security/errorReporting';

class Boundary extends Component<{children:ReactNode;km:boolean},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){reportBoundaryError({boundary:'route',section:'wallet',error});}
  render(){
    if(!this.state.failed)return this.props.children;
    const km=this.props.km;
    return <main className="min-h-screen bg-background text-foreground pb-24">
      <header className="border-b p-5 flex items-center gap-4"><a href="/account" className="min-h-11 inline-flex items-center underline">{km?'ត្រឡប់':'Back'}</a><h1 className="text-lg font-bold">{km?'កាបូប':'Wallet'}</h1></header>
      <div role="alert" className="mx-auto max-w-lg p-6 space-y-4"><h2 className="font-semibold">{km?'មិនអាចផ្ទុកកាបូបបានទេ':'Your wallet could not load'}</h2>
        <p>{km?'សូមរង់ចាំបន្តិច រួចព្យាយាមម្ដងទៀត។':'Please wait a moment, then try again.'}</p>
        <button type="button" className="min-h-11 rounded-xl border px-5 font-semibold" onClick={()=>this.setState({failed:false})}>{km?'ព្យាយាមម្ដងទៀត':'Retry'}</button>
      </div>
    </main>;
  }
}
export default function WalletRouteBoundary({children}:{children:ReactNode}){
  const {currentLanguage}=useI18n();
  return <Boundary km={currentLanguage==='km'}>{children}</Boundary>;
}
