import React,{Component,useEffect,useState} from "react";
import {Canvas,useThree} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import CityScene from "./CityScene.jsx";

const readMotion=()=>typeof window!=="undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
class Boundary extends Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error){console.warn("City 3D fallback (your expense calculations still work)",error?.message);}
 render(){return this.state.failed?<div className="city-error" role="note">
   這台裝置暫時不能播放 3D 街景。下面的地點按鈕照樣可以點，生活費也會正常計算。
 </div>:this.props.children;}
}
function supportsWebGL(){
 try{
  const canvas=document.createElement("canvas");
  const context=canvas.getContext("webgl2",{failIfMajorPerformanceCaveat:true})||canvas.getContext("webgl");
  return !!context;
 }catch{return false;}
}
function FrameTicker({animate}){
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{
   invalidate();
   if(!animate)return undefined;
   // ~15 FPS while animating is enough for the miniature street and prevents
   // mobile battery drain / software WebGL from starving large accessible UI.
   const timer=setInterval(()=>invalidate(),66);
   return ()=>clearInterval(timer);
 },[animate,invalidate]);
 return null;
}
export default function App(){
 const [state,setState]=useState(()=>window.__livingCityState||{});
 const [selected,setSelected]=useState("home");
 const [visible,setVisible]=useState(false);
 const [motionOff]=useState(readMotion);
 const [webgl]=useState(supportsWebGL);
 const small=window.innerWidth<610;
 const [mobile,setMobile]=useState(small);
 useEffect(()=>{
  const value=window.__livingCityState;if(value)setState({...value});
  const onState=e=>setState({...e.detail});
  const onSelect=e=>setSelected(e.detail.place);
  const onResize=()=>setMobile(window.innerWidth<610);
  window.addEventListener("livingcity:state",onState);
  window.addEventListener("livingcity:select",onSelect);
  window.addEventListener("resize",onResize);
  const host=document.getElementById("living-city-root");
  let observer;
  if("IntersectionObserver" in window){
    observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){setVisible(true);observer.disconnect();}}, {rootMargin:"250px"});
    if(host)observer.observe(host);
  }else setVisible(true);
  return ()=>{
   observer?.disconnect();
   window.removeEventListener("livingcity:state",onState);
   window.removeEventListener("livingcity:select",onSelect);
   window.removeEventListener("resize",onResize);
  };
 },[]);
 function onSelect(place){
   setSelected(place);
   window.dispatchEvent(new CustomEvent("livingcity:select",{detail:{place}}));
 }
 if(!visible)return <div className="city-loading" role="status">正在準備 3D 生活小城……</div>;
 if(!webgl)return <div className="city-error" role="note">你的裝置不支援 3D，改用下面的大按鈕一樣能看懂與操作所有數字。</div>;
 return <Boundary>
  <Canvas
    shadows={{type:2}}
    frameloop="demand"
    dpr={mobile?[1,1.1]:[1,1.35]}
    orthographic
    camera={{position:[13,15,18],zoom:mobile?14:36,near:.1,far:120}}
    onCreated={({gl})=>{gl.setClearColor("#102b3a");const p=document.getElementById("living-city-root");if(p)p.dataset.cityReady="true";}}
    gl={{antialias:true,alpha:false,powerPreference:"low-power"}}
    style={{width:"100%",height:"100%",touchAction:"pan-y"}}>
    <FrameTicker animate={!motionOff}/>
    <CityScene state={state} selected={selected} onSelect={onSelect} motion={!motionOff}/>
    <OrbitControls makeDefault enablePan={false} enableZoom={true} minZoom={mobile?11:24}
      maxZoom={mobile?26:58} minPolarAngle={Math.PI*.24} maxPolarAngle={Math.PI*.48}
      enableDamping dampingFactor={.07} target={[0,.2,0]} />
  </Canvas>
  <div className="city-ui-hint" aria-hidden="true">拖曳旋轉街區　·　滾輪或雙指可縮放</div>
 </Boundary>;
}
