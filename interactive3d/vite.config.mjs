import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
 root,
 publicDir:false,
 build:{
   outDir:path.resolve(root,'../site/scene-assets'),
   emptyOutDir:true,
   target:'es2020',
   minify:'esbuild',
   sourcemap:false,
   lib:{entry:path.resolve(root,'src/index.jsx'),name:'TWDLivingCity',formats:['iife'],fileName:()=> 'living-city.js'},
   rollupOptions:{output:{
     inlineDynamicImports:true,
     // Some React Three Fiber / Drei transitive packages reference Node's
     // process.env at runtime when bundled in library (IIFE) mode.
     // Supply a deliberately tiny browser-safe production env shim.
     banner:"var process={env:{NODE_ENV:'production'}};"
   }}
 },
 resolve:{dedupe:['react','react-dom','three']}
});
