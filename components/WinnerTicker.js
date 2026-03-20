
import{useEffect,useState}from"react";
export default function WinnerTicker(){
const[m,setM]=useState("");
useEffect(()=>{
const i=setInterval(()=>{setM("🎉 玩家剛贏 $"+Math.floor(Math.random()*5000));},3000);
return()=>clearInterval(i)},[]);
return<div className="text-green-400 text-center py-2">{m}</div>}
