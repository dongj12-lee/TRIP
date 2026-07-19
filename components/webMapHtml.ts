// Shared Naver Maps runtime + data builders for both WebMap.tsx (native
// WebView, inline HTML + baseUrl) and WebMap.web.tsx (browser iframe pointed
// at the real same-origin public/naver-map.html). react-native-webview has
// no web target, and a srcDoc/blob iframe reports window.location as
// "about:srcdoc" — which the Naver SDK's domain check always rejects — so the
// two platforms load the map differently but share ALL rendering logic below.
// See docs/OPERATIONS.md.

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  color?: string; // pin fill (category color); falls back to accent
  number?: number; // numbered circle (route-stop style)
  selected?: boolean;
  saved?: boolean; // a place the traveler saved — drawn with a heart center
  external?: boolean; // found via live Naver search, not in TRIP's own catalog
};

export type MapData = {
  cluster: boolean;
  colors: { accent: string; surface: string; ink: string };
  pins: MapPin[];
  polyline?: [number, number][];
};

export const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID;
// Must match a Service URL registered for the Client ID in the NCP console.
// Native WebView reports this as window.location via baseUrl.
export const MAP_ORIGIN = 'http://localhost';

// Category → pin color. Distinguishable but kept in the app's warm register,
// so a colored pin still reads clearly even if the emoji glyph fails to
// render (a real issue on some Android WebViews).
export function categoryPinColor(category: string, sub?: string | null): string {
  if (sub?.includes('Cafe')) return '#9c6b3f';
  if (sub?.includes('Bar')) return '#7a4a8c';
  if (sub?.includes('Restaurant')) return '#c15b3f';
  if (category.includes('Cuisine')) return '#c15b3f';
  if (category.includes('Culture')) return '#4d5589';
  if (category.includes('History')) return '#9c4a54';
  if (category.includes('Nature')) return '#5f7d53';
  if (category.includes('Shopping')) return '#c28a3f';
  if (category.includes('Experience')) return '#3f8f8a';
  return '#7a7168';
}

// The full in-page map runtime, as a plain-JS string injected into both the
// native WebView HTML and the web iframe. Exposes window.__renderMap(data)
// (idempotent — clears and redraws, re-clusters on zoom) and calls
// window.__onPin(id) on individual-pin taps. Keep this dependency-free: it
// runs inside the map page, not the RN bundle. (No backticks / ${} inside.)
export const MAP_RUNTIME_JS = String.raw`
(function(){
  var map=null, overlays=[], DATA=null, fitKey='';

  function worldPx(lat,lng,z){
    var s=256*Math.pow(2,z);
    var x=(lng+180)/360*s;
    var sl=Math.sin(lat*Math.PI/180);
    if(sl>0.9999){sl=0.9999;} if(sl<-0.9999){sl=-0.9999;}
    var y=(0.5-Math.log((1+sl)/(1-sl))/(4*Math.PI))*s;
    return {x:x,y:y};
  }
  // Clean SVG teardrop pin (no emoji — glyph rendering varies across
  // WebViews and reads as clutter at browse density).
  function pinHtml(p,cs){
    if(p.number!=null){
      return '<div style="width:28px;height:28px;border-radius:999px;background:'+cs.accent+';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font:800 13px system-ui;color:#fff">'+p.number+'</div>';
    }
    // A live-search result outside TRIP's own catalog — a distinct ink pin
    // with a magnifier center and a dashed ring, so it visually reads as
    // "found, not curated" rather than one of the app's own places.
    if(p.external){
      var eh=36, ew=Math.round(eh*0.72);
      return '<svg width="'+ew+'" height="'+eh+'" viewBox="0 0 24 33" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.4))"><path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 10 19.6 11.2 20.8a1.1 1.1 0 0 0 1.6 0C14 31.6 24 20.6 24 12 24 5.4 18.6 0 12 0z" fill="'+cs.ink+'"/><circle cx="12" cy="11.6" r="7.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-dasharray="2,2"/><circle cx="11" cy="10.6" r="3.1" fill="none" stroke="#fff" stroke-width="1.8"/><line x1="13.3" y1="12.9" x2="15.5" y2="15.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';
    }
    var fill=p.selected?cs.accent:(p.color||cs.accent);
    // Saved spots sit between normal and selected in size and carry a heart
    // center instead of a dot — so a traveler's shortlist stands out on the map.
    var h=p.selected?34:(p.saved?31:27), w=Math.round(h*0.72);
    var center=p.saved
      ? '<path d="M12 15s-3.3-2.3-3.3-4.5a1.75 1.75 0 0 1 3.3-.85 1.75 1.75 0 0 1 3.3.85C15.3 12.7 12 15 12 15z" fill="rgba(255,255,255,.96)"/>'
      : '<circle cx="12" cy="11.6" r="4.6" fill="rgba(255,255,255,.92)"/>';
    return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 24 33" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))"><path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 10 19.6 11.2 20.8a1.1 1.1 0 0 0 1.6 0C14 31.6 24 20.6 24 12 24 5.4 18.6 0 12 0z" fill="'+fill+'"/>'+center+'</svg>';
  }
  // Cluster bubble — quiet Airbnb-style white disc, ink count, hairline ring.
  function bubbleHtml(n,cs){
    var sz=n<10?34:(n<100?40:46);
    var fs=n<100?13:12;
    return '<div style="width:'+sz+'px;height:'+sz+'px;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 1px 6px rgba(0,0,0,.22),inset 0 0 0 1px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:center;font:700 '+fs+'px -apple-system,system-ui;color:'+cs.ink+'">'+n+'</div>';
  }
  function clear(){ for(var i=0;i<overlays.length;i++){ overlays[i].setMap(null); } overlays=[]; }
  function addMarker(pos,html,ax,ay,onClick){
    var m=new naver.maps.Marker({position:pos,map:map,icon:{content:html,anchor:new naver.maps.Point(ax,ay)}});
    if(onClick){ naver.maps.Event.addListener(m,'click',onClick); }
    overlays.push(m); return m;
  }
  function pinAt(p,cs){
    var ax=p.number!=null?14:(p.external?13:(p.selected?12:(p.saved?11:9))), ay=p.number!=null?14:(p.external?36:(p.selected?34:(p.saved?31:27)));
    addMarker(new naver.maps.LatLng(p.lat,p.lng),pinHtml(p,cs),ax,ay,(function(pin){return function(){ if(window.__onPin){ window.__onPin(pin.id); } };})(p));
  }
  function build(){
    if(!DATA||!map){ return; }
    clear();
    var cs=DATA.colors;
    if(DATA.polyline&&DATA.polyline.length>1){
      var path=[]; for(var i=0;i<DATA.polyline.length;i++){ path.push(new naver.maps.LatLng(DATA.polyline[i][0],DATA.polyline[i][1])); }
      overlays.push(new naver.maps.Polyline({map:map,path:path,strokeColor:cs.accent,strokeWeight:3,strokeOpacity:0.85,strokeStyle:'shortdash'}));
    }
    if(!DATA.cluster){
      for(var j=0;j<DATA.pins.length;j++){ pinAt(DATA.pins[j],cs); }
      return;
    }
    // Viewport culling (with a margin) so the full 2k+ catalog stays cheap:
    // only pins near the visible area become DOM markers at any zoom.
    var mb=map.getBounds(), sw=mb.getSW(), ne=mb.getNE();
    var mLat=(ne.lat()-sw.lat())*0.3, mLng=(ne.lng()-sw.lng())*0.3;
    var lo=sw.lat()-mLat, hi=ne.lat()+mLat, lf=sw.lng()-mLng, rt=ne.lng()+mLng;
    var z=map.getZoom(), GRID=76, cells={};
    for(var k=0;k<DATA.pins.length;k++){
      var p=DATA.pins[k];
      if(p.lat<lo||p.lat>hi||p.lng<lf||p.lng>rt){ continue; }
      var w=worldPx(p.lat,p.lng,z);
      var key=Math.floor(w.x/GRID)+'_'+Math.floor(w.y/GRID);
      if(!cells[key]){ cells[key]=[]; } cells[key].push(p);
    }
    Object.keys(cells).forEach(function(key){
      var m=cells[key];
      if(m.length===1){ pinAt(m[0],cs); return; }
      var la=0,ln=0; for(var q=0;q<m.length;q++){ la+=m[q].lat; ln+=m[q].lng; }
      la/=m.length; ln/=m.length;
      var sz=m.length<10?34:(m.length<100?40:46);
      addMarker(new naver.maps.LatLng(la,ln),bubbleHtml(m.length,cs),sz/2,sz/2,(function(clat,clng){return function(){ map.setCenter(new naver.maps.LatLng(clat,clng)); map.setZoom(Math.min(map.getZoom()+2,18),true); };})(la,ln));
    });
  }
  // Re-fit only when the pin SET changes (not on selection/highlight churn),
  // so tapping a pin never yanks the camera back out.
  function maybeFit(){
    if(!DATA||!DATA.pins.length){ return; }
    var key=DATA.pins.length+':'+DATA.pins[0].id+':'+DATA.pins[DATA.pins.length-1].id;
    if(key===fitKey){ return; }
    fitKey=key;
    if(DATA.pins.length===1){ map.setCenter(new naver.maps.LatLng(DATA.pins[0].lat,DATA.pins[0].lng)); map.setZoom(15); return; }
    var b=new naver.maps.LatLngBounds(new naver.maps.LatLng(DATA.pins[0].lat,DATA.pins[0].lng),new naver.maps.LatLng(DATA.pins[0].lat,DATA.pins[0].lng));
    for(var i=1;i<DATA.pins.length;i++){ b.extend(new naver.maps.LatLng(DATA.pins[i].lat,DATA.pins[i].lng)); }
    map.fitBounds(b,{top:50,right:50,bottom:50,left:50});
  }
  window.__renderMap=function(data){
    DATA=data;
    if(!map){
      map=new naver.maps.Map('map',{center:new naver.maps.LatLng(37.5665,126.978),zoom:12,scaleControl:false,mapDataControl:false,logoControl:true,zoomControl:false});
      naver.maps.Event.addListener(map,'idle',build);
    }
    maybeFit(); build();
  };
})();
`;

// Full HTML document for the NATIVE WebView (loaded with a baseUrl that fakes
// window.location so the Naver domain check passes). Data is pushed in
// afterwards via injectJavaScript(window.__renderMap(...)).
export function buildNativeShell(clientId: string) {
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />' +
    '<style>html,body,#map{width:100%;height:100%;margin:0;padding:0}</style>' +
    '<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=' + clientId + '&language=en"></script>' +
    '</head><body><div id="map"></div>' +
    '<script>' + MAP_RUNTIME_JS + '</script>' +
    '<script>window.__onPin=function(id){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"pinPress",id:id}));};</script>' +
    '</body></html>'
  );
}

// The data payload consumed by window.__renderMap (both platforms).
export function buildMapData(opts: {
  pins: MapPin[];
  polyline?: { lat: number; lng: number }[];
  cluster: boolean;
  accent: string;
  surface: string;
  ink: string;
}): MapData {
  return {
    cluster: opts.cluster,
    colors: { accent: opts.accent, surface: opts.surface, ink: opts.ink },
    pins: opts.pins,
    polyline: opts.polyline?.map((p) => [p.lat, p.lng] as [number, number]),
  };
}
