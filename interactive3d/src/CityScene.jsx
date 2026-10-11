import React,{useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {Html,RoundedBox} from "@react-three/drei";

/* 3D low-poly illustrative Taiwanese town. No external models/textures/assets. */
export const PLACES=[
 {id:"home",name:"住家",pos:[-4,-2.6],color:"#ffba8b"},
 {id:"market",name:"市場",pos:[-1.3,-3.05],color:"#80edb1"},
 {id:"hospital",name:"醫院",pos:[3.7,-2.7],color:"#84ccfc"},
 {id:"lunch",name:"便當店",pos:[1.5,3.2],color:"#ffc47b"},
 {id:"utilities",name:"水電",pos:[-4,2.8],color:"#d1b2ff"},
 {id:"fx",name:"世界匯率",pos:[4.3,2.65],color:"#8fe0e7"}
];
function Ground(){
 return <>
   <RoundedBox args={[15.8,.78,12.6]} position={[0,-.56,0]} radius={.22} smoothness={3} castShadow receiveShadow>
     <meshStandardMaterial color="#294c5a" metalness={.13} roughness={.75}/>
   </RoundedBox>
   <RoundedBox args={[15.45,.14,12.26]} position={[0,-.13,0]} radius={.2} smoothness={3} receiveShadow>
     <meshStandardMaterial color="#456375" roughness={.8}/>
   </RoundedBox>
   <mesh position={[0,-.045,.69]} receiveShadow><boxGeometry args={[15.1,.04,1.5]}/><meshStandardMaterial color="#182d3b"/></mesh>
   <mesh position={[.16,-.043,0]} receiveShadow><boxGeometry args={[1.25,.04,11.8]}/><meshStandardMaterial color="#182d3b"/></mesh>
   {Array.from({length:12},(_,i)=><mesh key={i} position={[-5.9+i*1.08,-.006,.7]}>
     <boxGeometry args={[.65,.01,.045]}/><meshStandardMaterial color="#efcc87" emissive="#796239" emissiveIntensity={.15}/>
   </mesh>)}
   {Array.from({length:8},(_,i)=><mesh key={i} position={[.16,-.004,-5+i*1.4]}>
     <boxGeometry args={[.045,.015,.75]}/><meshStandardMaterial color="#efcc87"/>
   </mesh>)}
   {[-6.2,6.2].map((z,i)=><mesh key={i} position={[0,-.105,z]}>
     <boxGeometry args={[14.8,.035,.04]}/><meshBasicMaterial color="#7cccd2"/>
   </mesh>)}
 </>;
}
function Plot(){
 return <RoundedBox args={[2.65,.07,2.35]} position={[0,.002,0]} radius={.12} smoothness={3} receiveShadow>
   <meshStandardMaterial color="#7895a0" roughness={.85}/>
 </RoundedBox>;
}
function Glass({x,y,z,w=.38,h=.39,warm=false}){
 return <mesh position={[x,y,z]}><boxGeometry args={[w,h,.035]}/>
   <meshStandardMaterial color={warm?"#f8ddae":"#9ce3e6"} emissive={warm?"#9a7338":"#398f94"} emissiveIntensity={warm?.5:.28} roughness={.36}/>
 </mesh>;
}
function House(){
 return <group><Plot/>
   <RoundedBox args={[1.95,1.65,1.8]} position={[0,.91,0]} radius={.1} castShadow>
     <meshStandardMaterial color="#f5ccaa" roughness={.85}/>
   </RoundedBox>
   <mesh position={[0,1.98,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[1.68,1.24,4]}/><meshStandardMaterial color="#ce7465" roughness={.7}/></mesh>
   <mesh position={[0,.42,.93]}><boxGeometry args={[.48,.78,.06]}/><meshStandardMaterial color="#80645a"/></mesh>
   <Glass x={-.65} y={1.23} z={.93} warm/><Glass x={.65} y={1.23} z={.93} warm/>
   <mesh position={[-1.04,.3,.93]}><cylinderGeometry args={[.33,.36,.37,8]}/><meshStandardMaterial color="#bf7c69"/></mesh>
   <mesh position={[-1.04,.68,.93]}><dodecahedronGeometry args={[.42,0]}/><meshStandardMaterial color="#54a487" flatShading/></mesh>
 </group>;
}
function Market(){
 return <group><Plot/>
   <RoundedBox args={[2.18,1.47,1.43]} position={[0,.79,-.15]} radius={.1} castShadow><meshStandardMaterial color="#afe0c3"/></RoundedBox>
   <mesh position={[0,1.62,-.15]}><boxGeometry args={[2.32,.19,1.7]}/><meshStandardMaterial color="#208879"/></mesh>
   {Array.from({length:5},(_,i)=><mesh key={i} position={[-.92+i*.46,1.22,.72]}>
     <boxGeometry args={[.45,.46,.65]}/><meshStandardMaterial color={i%2?"#ffe3be":"#df8c69"}/>
   </mesh>)}
   {[-.65,0,.65].map((x,i)=><mesh key={i} position={[x,.57,.82]}><sphereGeometry args={[.2,8,6]}/><meshStandardMaterial color={["#f5a557","#f36b67","#87ba62"][i]}/></mesh>)}
 </group>;
}
function Clinic({alarm}){
 return <group><Plot/>
   <RoundedBox args={[2.24,2.26,1.66]} position={[0,1.17,0]} radius={.09} castShadow><meshStandardMaterial color={alarm?"#f7dedc":"#dce9e7"}/></RoundedBox>
   {Array.from({length:2},(_,r)=>[-.67,0,.67].map((x,c)=><Glass key={r+"-"+c} x={x} y={.86+r*.77} z={.847} w={.39} h={.36} warm={r===0}/>))}
   <mesh position={[0,2.07,.89]}><boxGeometry args={[.2,.73,.07]}/><meshStandardMaterial color="#d85865" emissive="#862f3e" emissiveIntensity={.3}/></mesh>
   <mesh position={[0,2.07,.927]}><boxGeometry args={[.72,.19,.06]}/><meshStandardMaterial color="#d85865"/></mesh>
   <mesh position={[0,2.42,0]}><boxGeometry args={[2.45,.14,1.89]}/><meshStandardMaterial color="#67899a"/></mesh>
 </group>;
}
function BentoShop({inflation}){
 return <group><Plot/>
   <RoundedBox args={[2.17,1.45,1.5]} position={[0,.79,0]} radius={.1} castShadow><meshStandardMaterial color="#e9b38d"/></RoundedBox>
   <mesh position={[0,1.64,.02]}><boxGeometry args={[2.4,.24,1.78]}/><meshStandardMaterial color={inflation?"#ed7564":"#edb969"}/></mesh>
   {Array.from({length:6},(_,i)=><mesh key={i} position={[-.97+i*.39,1.27,.88]}>
     <boxGeometry args={[.37,.44,.32]}/><meshStandardMaterial color={i%2?"#fff1dd":"#ae6b63"}/>
   </mesh>)}
   <mesh position={[0,.49,.78]}><boxGeometry args={[1.07,.6,.06]}/><meshStandardMaterial color="#8b5b43"/></mesh>
   <mesh position={[0,.51,.81]}><boxGeometry args={[.87,.43,.03]}/><meshStandardMaterial color="#ffd09b" emissive="#9c673b" emissiveIntensity={.24}/></mesh>
 </group>;
}
function PowerHouse({inflation}){
 return <group><Plot/>
   <RoundedBox args={[1.97,1.5,1.65]} position={[0,.8,0]} radius={.1} castShadow><meshStandardMaterial color="#abbfdc"/></RoundedBox>
   {[-.52,.52].map(x=><mesh key={x} position={[x,.85,.845]}><boxGeometry args={[.57,.7,.035]}/><meshStandardMaterial color="#315c7a"/></mesh>)}
   <mesh position={[0,1.64,-.15]} rotation={[0,0,-.13]}><boxGeometry args={[2.18,.13,1.92]}/><meshStandardMaterial color={inflation?"#d290d7":"#6e91ae"}/></mesh>
   <mesh position={[0,2.05,.03]}><octahedronGeometry args={[.34,0]}/><meshStandardMaterial color={inflation?"#ebbdff":"#fff0a6"} emissive={inflation?"#a14da6":"#d2ac57"} emissiveIntensity={.45}/></mesh>
 </group>;
}
function WorldBank(){
 return <group><Plot/>
   <RoundedBox args={[1.89,2.76,1.71]} position={[0,1.41,0]} radius={.1} castShadow><meshStandardMaterial color="#588fa2" metalness={.18} roughness={.45}/></RoundedBox>
   {Array.from({length:4},(_,i)=><group key={i}><Glass x={-.48} y={.58+i*.6} z={.86} w={.49} h={.35}/>
     <Glass x={.48} y={.58+i*.6} z={.86} w={.49} h={.35}/></group>)}
   <mesh position={[0,2.9,0]}><boxGeometry args={[2.1,.15,1.98]}/><meshStandardMaterial color="#8ac0c8"/></mesh>
   <mesh position={[0,3.24,0]}><icosahedronGeometry args={[.32,1]}/><meshStandardMaterial color="#b4f6f5" emissive="#298589" emissiveIntensity={.85} metalness={.3}/></mesh>
 </group>;
}
function Tree({x,z,scale=1}){
 return <group position={[x,.02,z]} scale={scale}>
   <mesh position={[0,.34,0]}><cylinderGeometry args={[.095,.13,.7,7]}/><meshStandardMaterial color="#956e57"/></mesh>
   <mesh position={[0,.92,0]} castShadow><dodecahedronGeometry args={[.57,0]}/><meshStandardMaterial color="#318a80" flatShading roughness={.8}/></mesh>
   <mesh position={[.23,1.16,.04]} castShadow><dodecahedronGeometry args={[.32,0]}/><meshStandardMaterial color="#61b49c" flatShading/></mesh>
 </group>;
}
function Streetlight({x,z}){
 return <group position={[x,0,z]}>
   <mesh position={[0,1.07,0]}><cylinderGeometry args={[.04,.05,2.2,7]}/><meshStandardMaterial color="#718b91"/></mesh>
   <mesh position={[.12,2.17,0]}><boxGeometry args={[.39,.06,.09]}/><meshStandardMaterial color="#829a9d"/></mesh>
   <mesh position={[.29,2.09,0]}><sphereGeometry args={[.14,8,6]}/><meshStandardMaterial color="#ffe2a6" emissive="#edb558" emissiveIntensity={1.6}/></mesh>
   <pointLight position={[.26,2.06,0]} intensity={.8} distance={3.7} color="#ffdea8"/>
 </group>;
}
function Traffic({motion}){
 const mover=useRef();
 useFrame(({clock})=>{if(mover.current&&motion)mover.current.position.x=-6.8+(clock.getElapsedTime()*.51%13.8);});
 return <group ref={mover} position={[-4.7,.1,.74]}>
   <RoundedBox args={[.88,.34,.47]} position={[0,.3,0]} radius={.1} castShadow><meshStandardMaterial color="#e5ad78"/></RoundedBox>
   {[-.32,.32].map(x=><mesh key={x} position={[x,.14,.24]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.125,.064,7,12]}/><meshStandardMaterial color="#171d25"/></mesh>)}
   <mesh position={[.13,.57,0]}><boxGeometry args={[.27,.29,.34]}/><meshStandardMaterial color="#b9e3eb"/></mesh>
 </group>;
}
function Highlight({color,enabled}){
 const circle=useRef();
 useFrame(({clock})=>{if(circle.current&&enabled){const scale=1+.06*Math.sin(clock.getElapsedTime()*2.5);circle.current.scale.set(scale,scale,scale);}});
 return <mesh ref={circle} visible={enabled} position={[0,.08,0]} rotation={[-Math.PI/2,0,0]}>
   <torusGeometry args={[1.4,.055,7,55]}/><meshBasicMaterial color={color}/>
 </mesh>;
}
function Block({entry,active,onSelect,state}){
 const id=entry.id;
 const amounts={
  home:"租金 "+Number(state.housing||0).toLocaleString("zh-TW"),
  market:"食物 "+Number(state.food||0).toLocaleString("zh-TW"),
  hospital:"平常醫療 "+Number(state.health||0).toLocaleString("zh-TW"),
  lunch:"便當 "+Number(state.bento||100).toLocaleString("zh-TW"),
  utilities:"水電 "+Number(state.utilities||0).toLocaleString("zh-TW"),
  fx:"官方 H.10"
 };
 return <group position={[entry.pos[0],.02,entry.pos[1]]} onClick={e=>{e.stopPropagation();onSelect(id);}}>
   <Highlight enabled={active} color={entry.color}/>
   {id==="home"&&<House/>}
   {id==="market"&&<Market/>}
   {id==="hospital"&&<Clinic alarm={!!state.medical}/>}
   {id==="lunch"&&<BentoShop inflation={!!state.bentoShock}/>}
   {id==="utilities"&&<PowerHouse inflation={!!state.power}/>}
   {id==="fx"&&<WorldBank/>}
   <Html center transform distanceFactor={14} position={[0,3.16,0]} style={{pointerEvents:"auto"}}>
     <button type="button" className={"city-label"+(active?" active":"")} onClick={e=>{e.stopPropagation();onSelect(id);}}>
        <span>{entry.name}</span><small>{amounts[id]}</small>
     </button>
   </Html>
 </group>;
}
export default function CityScene({state={},selected="home",onSelect=()=>{},motion=true}){
 return <>
  <color attach="background" args={["#102b3a"]}/><fog attach="fog" args={["#102b3a",24,54]}/>
  <ambientLight intensity={.85} color="#cde6eb"/>
  <hemisphereLight args={["#e7f8ff","#233d45",1.5]}/>
  <directionalLight castShadow position={[-8,14,9]} intensity={2.4} color="#ffdec0"
    shadow-mapSize={[1024,1024]} shadow-camera-left={-12} shadow-camera-right={12}
    shadow-camera-top={12} shadow-camera-bottom={-10} shadow-bias={-.0004}/>
  <pointLight position={[7,6,-7]} color="#3c919f" intensity={32} distance={23}/>
  <Ground/>
  {PLACES.map(x=><Block key={x.id} entry={x} active={selected===x.id} onSelect={onSelect} state={state}/>)}
  {[[-6.3,-4.5],[-5.6,-4.7],[1.1,-4.9],[6.15,-4.4],[-6.25,4.7],[6.1,4.8],[-2.2,4.94]].map(([x,z],i)=><Tree key={i} x={x} z={z} scale={.8+(i%3)*.13}/>)}
  <Streetlight x={-2.4} z={.02}/><Streetlight x={2.8} z={1.48}/>
  <Traffic motion={motion}/>
 </>;
}
