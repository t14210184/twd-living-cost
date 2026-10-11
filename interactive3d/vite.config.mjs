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
   rollupOptions:{output:{inlineDynamicImports:true}}
 },
 resolve:{dedupe:['react','react-dom','three']}
});
