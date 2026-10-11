import React from "react";
import {createRoot} from "react-dom/client";
import App from "./App.jsx";

const mount=document.getElementById("living-city-root");
if(mount){
 try{
  createRoot(mount).render(<React.StrictMode><App/></React.StrictMode>);
 }catch(error){
  mount.textContent="3D 街景無法啟動；下面的地點按鈕與生活費試算仍可使用。";
  console.warn("3D island fallback",error);
 }
}
