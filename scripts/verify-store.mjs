import{ArtifactStore}from "../src/store/artifact-store.mjs";
const s=new ArtifactStore("artifacts");const a=s.put("store-test","script",{text:"same"}),b=s.put("store-test","script",{text:"same"});if(a.hash!==b.hash||!a.path)throw new Error("content address cache failed");console.log("store PASS");
