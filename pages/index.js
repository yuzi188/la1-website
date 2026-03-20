
import WinnerTicker from "../components/WinnerTicker";
import FloatingButtons from "../components/FloatingButtons";
import AIRecommend from "../components/AIRecommend";

export default function Home(){
return(
<div className="relative min-h-screen text-white overflow-hidden">

<div className="absolute w-[400px] h-[400px] bg-purple-600 blur-3xl opacity-20 top-[-100px] left-[-100px]" />
<div className="absolute w-[300px] h-[300px] bg-blue-500 blur-3xl opacity-20 bottom-[-100px] right-[-100px]" />

<div className="relative z-10">

<WinnerTicker/>

<div className="text-center py-20">
<img src="/logo.svg" className="mx-auto mb-4"/>
<h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
LA1 AI Entertainment
</h1>
<p className="text-gray-400 mt-2">AI推薦娛樂平台 · VIP專屬體驗</p>
<button onClick={()=>window.open("https://t.me/yourbot","_blank")}
className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:scale-105 transition">
🚀 立即開始</button>
</div>

<div className="p-6 grid grid-cols-2 gap-4">
{["🎰 老虎機","🃏 百家樂","🎲 骰寶","🎯 輪盤"].map((i,idx)=>(
<div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 hover:scale-105 transition">
{i}</div>
))}
</div>

<div className="p-6"><AIRecommend/></div>

<FloatingButtons/>

</div>
</div>
)}
