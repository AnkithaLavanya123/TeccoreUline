/*!************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2013 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/
if(typeof s7viewers == "undefined") {
	s7viewers = {};
}else if(typeof s7viewers != "object") {
	throw new Error("Cannot initialize a root 's7viewers' package. s7viewers is not an object");
}

if(!s7viewers.ZoomViewer) {
	(function(){
		var s7sdk;
		/**
		 * Construct a ZoomViewer object
		 * @param {Object} inObj optional simple JSON object that consists of name:value pairs for customization of the viewer.
		 */
		s7viewers.ZoomViewer = function (inObj) {
            this.sdkBasePath = '../../s7sdk/3.4/';
			this.containerId = null;
			this.params = {};
			this.handlers = [];
	//		this.onInitComplete = null;
			this.onInitFail = null;
			this.initializationComplete = false;
			this.initCalled = false;
			this.firstMediasetParsed = false;
			this.isDisposed = false;
			this.utilsScriptElm = null;
			this.fixinputmarker = null;
			this.indicatormode = "page";
			this.numberOfItems = null;
			this.sdkProvided = false;			

			if (typeof inObj == "object"){
				if (inObj.containerId) {
					this.setContainerId(inObj.containerId)
				}
				if (inObj.params) {
					for(var param in inObj.params) {
						if(inObj.params.hasOwnProperty(param) && inObj.params.propertyIsEnumerable(param)) {
							this.setParam(param,inObj.params[param]);
						}
					}
				}
				if (inObj.handlers) {
					this.setHandlers(inObj.handlers);
				}
				if (inObj.localizedTexts) {
					this.setLocalizedTexts(inObj.localizedTexts);
				}
			}
		};

		s7viewers.ZoomViewer.cssClassName = "s7zoomviewer";

		s7viewers.ZoomViewer.prototype.modifiers = {
			indicatorMode: { params: ["indicatormode"], defaults: ["page"], ranges:[["item","page"]]}
		};

		s7viewers.ZoomViewer.prototype.setContainerId = function (inElemId) {
			if (this.isDisposed) return;
			this.containerId = inElemId || null;
		};
		
		s7viewers.ZoomViewer.getCodeBase = function() {
			var contentUrl = "";
			var viewerPath = "";
			var scriptTags = null;
			if (document.scripts){
				scriptTags = document.scripts;
			} else {
				scriptTags = document.getElementsByTagName("script");
			}

			for(var i=0; i<scriptTags.length;i++){
				var src = scriptTags[i].src;
				var result = /^\s*(http[s]?:\/\/[^\/]*)?(.*)(\/(js|js_orig)\/ZoomViewer\.js)/.exec(src);
				if (result && result.length == 5) {
					if ( typeof result[1] !== 'undefined' ) {
						contentUrl = result[1];
					}
					contentUrl += result[2];
					viewerPath = src;
					break;
				 }
			}
			if ((contentUrl != '') && (contentUrl.lastIndexOf('/') != contentUrl.length - 1)) {
				contentUrl += '/';
			}
			
			var codebaseRegEx = /\/etc\/dam\/viewers\//;
			s7viewers.ZoomViewer.codebase = {"contentUrl": contentUrl, "isDAM": codebaseRegEx.test(viewerPath)};
			
		};
		s7viewers.ZoomViewer.getCodeBase();
		
		s7viewers.ZoomViewer.prototype.getContentUrl = function () {
			return s7viewers.ZoomViewer.codebase.contentUrl;
		};

		s7viewers.ZoomViewer.prototype.includeViewer = function () {
			s7sdk.Util.lib.include("s7sdk.set.MediaSet");
			s7sdk.Util.lib.include("s7sdk.image.ZoomView");
			s7sdk.Util.lib.include("s7sdk.common.Button");
			s7sdk.Util.lib.include("s7sdk.common.Container");
			s7sdk.Util.lib.include("s7sdk.set.Swatches");
			s7sdk.Util.lib.include("s7sdk.set.SetIndicator");

			this.trackingManager = new s7sdk.TrackingManager(); // needs to be created first to track LOAD event

			this.s7params = new s7sdk.ParameterManager(null,null,{"asset" : "MediaSet.asset"},this.getContentUrl()+"ZoomViewer_light.css");
			var viewerName = ""; 
			if (this.s7params.params.config && (typeof(this.s7params.params.config) == "string")) {
				viewerName = ",";
				if (this.s7params.params.config.indexOf("/") > -1) {
					viewerName += this.s7params.params.config.split('/')[1];
				} else 
					viewerName += this.s7params.params.config;
			}
			this.s7params.setViewer("502,5.9.1" + viewerName);

			for(var prm in this.params){
				if (prm != "localizedtexts"){
					this.s7params.push(prm, this.params[prm]);
				}else{
					this.s7params.setLocalizedTexts(this.params[prm]);
				}
			}

			this.container = null;
			this.zoomView = null;
			this.zoomInButton = null;
			this.zoomOutButton = null;
			this.zoomResetButton = null;
			this.closeButton = null;
			this.mediaSet = null; 
			this.fullScreenButton = null;
			this.swatches = null; 
			this.containerHeight = null;
			this.singleImage = null;
			this.divContainer = null;
			this.setindicator = null;
			//visibility manager
			this.visibilityManagerZoom = null;
			//initial frame
			this.initialFrame = 0;
			
			this.setPages = true;
			this.isOrientationMarkerForcedChanged = false;

			var self = this;
			
			function initViewer(){

				self.s7params.push("aemmode",  s7viewers.ZoomViewer.codebase.isDAM  ? "1" : "0");
				
				self.s7params.push("resizable", "0");
				self.s7params.push("tmblayout", "0,1");
				self.s7params.push("textpos", "none");
				//set indicator is not needed on desktop but we cannot handle via pure CSS
				
				if (s7sdk.browser.device.name == "desktop") self.s7params.push("ZoomView.singleclick", "zoomReset"); //singleclick and doubleclick for desktop have specific
				if (s7sdk.browser.device.name == "desktop") self.s7params.push("ZoomView.doubleclick", "reset");						
				if (s7sdk.browser.device.name != "desktop"){
					self.s7params.push("enablescrollbuttons","0");	
				}			

			/*get fixinputmarker*/
			var fixinputmarkerParam = self.getParam("fixinputmarker");
			if (fixinputmarkerParam) {
				self.fixinputmarker = (fixinputmarkerParam == "s7touchinput" || fixinputmarkerParam == "s7mouseinput") ? self.fixinputmarker = fixinputmarkerParam : null;
			};
			
			var urlParam = self.getURLParameter("fixinputmarker");
			if (urlParam){
				self.fixinputmarker = (urlParam == "s7touchinput" || urlParam == "s7mouseinput") ? self.fixinputmarker = urlParam : null;;
			};
				
			if (self.fixinputmarker){
				if(self.fixinputmarker === "s7mouseinput"){
					self.addClass(self.containerId,"s7mouseinput");
				}else if(self.fixinputmarker === "s7touchinput"){
					self.addClass(self.containerId,"s7touchinput");
				}
			}else{
				if (s7sdk.browser.supportsTouch()){
					self.addClass(self.containerId,"s7touchinput");
				}else{
					self.addClass(self.containerId,"s7mouseinput");
				}
			}
				/*get indicatormode*/
				var indicatormodeParam = self.getParam("indicatormode");
				if (indicatormodeParam) {
					self.indicatormode = (indicatormodeParam == "page" || indicatormodeParam == "item") ? self.indicatormode = indicatormodeParam : "page";
				};
				
				var indicatormodeUrlParam = self.getURLParameter("indicatormode");
				if (indicatormodeUrlParam){
					self.indicatormode = (indicatormodeUrlParam == "page" || indicatormodeUrlParam == "item") ? self.indicatormode = indicatormodeUrlParam : "page";
				};
				self.parseMods();

				self.container = new s7sdk.common.Container(self.containerId, self.s7params, self.containerId+"_container");
				if(self.container.isInLayout()){
					completeInitViewer();
				} else {
					self.container.addEventListener(s7sdk.event.ResizeEvent.ADDED_TO_LAYOUT, completeInitViewer, false);
				}
			}
			
			function completeInitViewer(){
				var isNotDesktop = !(s7sdk.browser.device.name == "desktop");
				
				self.container.removeEventListener(s7sdk.event.ResizeEvent.ADDED_TO_LAYOUT, completeInitViewer, false);

				// work-around for webkit issue with applying height:100% to the containing element

				var containerDiv = document.getElementById(self.containerId);
				var tempMinHeight = containerDiv.style.minHeight;
				containerDiv.style.minHeight = "1px";

				var testdiv = document.createElement("div");
				testdiv.style.position = "relative";
				testdiv.style.width = "100%";
				testdiv.style.height = "100%";
				containerDiv.appendChild(testdiv);
				var emptyViewerHeight = testdiv.offsetHeight;
				if (testdiv.offsetHeight <= 1){
					containerDiv.style.height = "100%";
					emptyViewerHeight = testdiv.offsetHeight;
				}
				containerDiv.removeChild(testdiv);
				containerDiv.style.minHeight = tempMinHeight;

				var responsive = false;
				switch(self.s7params.get("responsive", "auto")){
					case "fit":
						responsive = false;
						break;
					case "constrain":
						responsive = true;
						break;
					default :
						responsive = emptyViewerHeight == 0;
						break;
				}
				self.updateCSSMarkers();
				self.updateOrientationMarkers();
				if(self.container.isFixedSize()) { // free
					self.viewerMode = "fixed";
				} else {
					if(responsive) { // restrict
						self.viewerMode = "ratio";
					} else {
						self.viewerMode = "free";
					}
				}
				self.containerHeight = self.container.getHeight();
				self.zoomView = new s7sdk.image.ZoomView(self.container, self.s7params, self.containerId+"_zoomView");
				self.trackingManager.attach(self.zoomView);

				if ((self.s7params.get("closeButton", "0") == "1") || (self.s7params.get("closeButton", "0").toLowerCase() == "true")){
					self.closeButton = new s7sdk.common.CloseButton(self.container, self.s7params, self.containerId + "_closeButton");
					self.closeButton.addEventListener("click", closeWindow);
				}			

				self.divContainer = document.createElement('div');
				self.divContainer.setAttribute("id",self.containerId+"_divcontainer");
				self.divContainer.style.position = "absolute";
				var ctnr = document.getElementById(self.container.getInnerContainerId());
				ctnr.appendChild(self.divContainer);

				self.zoomInButton = new s7sdk.common.ZoomInButton(self.containerId+"_divcontainer", self.s7params, self.containerId+"_zoomInButton");
				self.zoomOutButton = new s7sdk.common.ZoomOutButton(self.containerId+"_divcontainer", self.s7params, self.containerId+"_zoomOutButton");
				self.zoomResetButton = new s7sdk.common.ZoomResetButton(self.containerId+"_divcontainer", self.s7params, self.containerId+"_zoomResetButton");
				self.fullScreenButton = new s7sdk.common.FullScreenButton(self.containerId+"_divcontainer", self.s7params, self.containerId + "_fullScreenButton");
				
				if (isNotDesktop) self.setindicator = new s7sdk.set.SetIndicator(self.container, self.s7params, self.containerId+"_setIndicator");

				self.swatches = new s7sdk.set.Swatches(self.container, self.s7params, self.containerId+"_swatches");
				self.trackingManager.attach(self.swatches);			

				self.divContainer.style.width= self.container.getWidth() + "px";
				self.divContainer.style.top= self.containerHeight - self.swatches.getHeight() + "px";
				self.divContainer.style.height = "0px";
				self.divContainer.style.zIndex = "1";
				updateLayout(self.container.getWidth(), self.container.getHeight(), self.container.getHeight());//??

				self.mediaSet = new s7sdk.set.MediaSet(null, self.s7params, self.containerId+"_mediaset");
				self.trackingManager.attach(self.mediaSet);

				self.notCustomSize = self.container.isPopup() && !self.container.isFixedSize();
				if (self.notCustomSize &&!self.container.supportsNativeFullScreen()) {
					self.fullScreenButton.setCSS(".s7fullscreenbutton", "display", "none");
				}

				self.trackingManager.setCallback(onProxyTrack);
				// AppMeasurementBridge only available when config2 modifier is present
				if ((typeof(AppMeasurementBridge) == "function") && (self.isConfig2Exist == true)){
					self.appMeasurementBridge = new AppMeasurementBridge(self.trackingParams);
				}

				if(self.viewerMode == "ratio"){
					containerDiv.style.height = "auto";
				}

				// ====================================== VisibilityManagers ====================================== //
				//Add VisibilityManager (for touch devices only)
				if (isNotDesktop) {
					self.visibilityManagerZoom = new s7sdk.VisibilityManager();
					self.visibilityManagerZoom.reference(self.zoomView);

					self.visibilityManagerZoom.attach(self.closeButton);

					self.visibilityManagerZoom.attach(self.zoomInButton);
					self.visibilityManagerZoom.attach(self.zoomOutButton);
					self.visibilityManagerZoom.attach(self.zoomResetButton);
					if (!self.notCustomSize  || self.container.supportsNativeFullScreen()) {
						self.visibilityManagerZoom.attach(self.fullScreenButton);
					}

					self.visibilityManagerZoom.attach(self.swatches);
					self.visibilityManagerZoom.attach(self.setindicator);

				}

				// ====================================== Event Listeners ====================================== //
				// Add Swatches event listeners
				self.swatches.addEventListener(s7sdk.AssetEvent.SWATCH_SELECTED_EVENT, swatchSelected, false); 
				if (isNotDesktop) self.swatches.addEventListener(s7sdk.event.SwatchEvent.SWATCH_PAGE_CHANGE, onPageChange, false);
				// Add MediaSet event listeners
				self.mediaSet.addEventListener(s7sdk.AssetEvent.NOTF_SET_PARSED, onSetParsed, false);
				// Add Container event listeners
				self.container.addEventListener(s7sdk.event.ResizeEvent.COMPONENT_RESIZE, onContainerResize,false);
				self.container.addEventListener(s7sdk.event.ResizeEvent.FULLSCREEN_RESIZE, onContainerFullScreen,false);	
				self.container.addEventListener(s7sdk.event.ResizeEvent.SIZE_MARKER_CHANGE, onContainerSizeMarkerChange,false);	
				// Add ZoomInButton event listeners
				self.zoomInButton.addEventListener("click", function(){self.zoomView.zoomIn();});
				// Add ZoomOutButton event listeners
				self.zoomOutButton.addEventListener("click", function(){self.zoomView.zoomOut();});
				// Add ZoomResetButton event listeners
				self.zoomResetButton.addEventListener("click",function(){self.zoomView.zoomReset(); });	
				// Add FullScreenButton event listeners
				self.fullScreenButton.addEventListener("click", onFullScreenButtonClick);
				// Add event listener for swipe image
				self.zoomView.addEventListener(s7sdk.event.AssetEvent.ASSET_CHANGED, onImageChanged, false);
				// Add buttons event listener (change states)
				self.zoomView.addEventListener(s7sdk.event.CapabilityStateEvent.NOTF_ZOOM_CAPABILITY_STATE,function(stateEvent){
					if (stateEvent.s7event.state.hasCapability(s7sdk.ZoomCapabilityState.ZOOM_IN))
						self.zoomInButton.activate();
					else
						self.zoomInButton.deactivate();
						
					if (stateEvent.s7event.state.hasCapability(s7sdk.ZoomCapabilityState.ZOOM_OUT))
						self.zoomOutButton.activate();
					else
						self.zoomOutButton.deactivate();						
							
					if (stateEvent.s7event.state.hasCapability(s7sdk.ZoomCapabilityState.ZOOM_RESET)){
						self.zoomResetButton.activate();
					}
					else {
						self.zoomResetButton.deactivate();
					}
				});				
	////

	////
				// ====================================== Event Handlers ====================================== //
				function onSetParsed(e) {
					var mediaSetDesc = e.s7event.asset;
					self.initialFrame = Math.max(0,parseInt((typeof(self.s7params.get('initialframe')) != 'undefined') ? self.s7params.get('initialframe') : 0));
					if (self.initialFrame < mediaSetDesc.items.length){
						//
					}else{
						self.initialFrame = 0;
					}	
					var assetRatio;
					if(self.viewerMode == "ratio"){
						var itm = mediaSetDesc.items[0];
						assetRatio = itm.width/itm.height;
					}

					self.numberOfItems = mediaSetDesc.items.length;
					if(mediaSetDesc.items.length == 1) {
						self.singleImage = true;
						self.swatches.setCSS(".s7swatches", "visibility", "hidden");
						if(self.viewerMode == "fixed") {
							self.container.resize (self.container.getWidth(), self.containerHeight - self.swatches.getHeight());
						} else if(self.viewerMode == "ratio") {
							self.container.setModifier({ "aspect": assetRatio });
						} else {
							updateLayout(self.container.getWidth(), self.container.getHeight(), self.container.getHeight());
						}
					} else {
						self.singleImage = false;
						self.swatches.setCSS(".s7swatches", "visibility", "inherit");
						if(self.viewerMode == "fixed") {
							self.container.resize (self.container.getWidth(), self.containerHeight);
							updateLayout(self.container.getWidth(), self.containerHeight, self.containerHeight - self.swatches.getHeight());
						} else if(self.viewerMode == "ratio") {
							var w = self.container.getWidth();
							if(s7sdk.browser.device.name == "desktop"){
								self.container.setModifier({ "aspect": w /( w/assetRatio + self.swatches.getHeight()) });
							} else {
								self.container.setModifier({ "aspect": assetRatio });
							}
						} else {
							updateLayout(self.container.getWidth(), self.containerHeight, self.containerHeight - self.swatches.getHeight());
						}
					}			
								
					self.swatches.setMediaSet(mediaSetDesc);
					self.swatches.selectSwatch(self.initialFrame, true);
					if ((isNotDesktop) && (self.setindicator)) {
						resolveIndicatorVisibility();
					}			

					if ((self.handlers["initComplete"] != null) && (typeof self.handlers["initComplete"] == "function") && !self.firstMediasetParsed){
                        if (typeof window.s7sdk == "undefined") {
                            window.s7sdk = s7sdk;
                        }
                        self.handlers["initComplete"]();
					}
					self.firstMediasetParsed = true;
				}			
				// Define an event handler function to update the SetIndicator when the swatch page changes
				function onPageChange(event){
					var pg = event.s7event.page.x;			
					if (self.setindicator && self.indicatormode === "page"){
						self.setindicator.setSelectedPage(pg);
					}
				}
				// FullScreenButton Event Handlers
				function onFullScreenButtonClick() { 
					if (!self.container.isFullScreen()){
						if(self.closeButton){
							self.closeButton.setCSS(".s7closebutton", "display", "none");
						}
						self.container.requestFullScreen();
					}
					else {
						if(self.closeButton){
							self.closeButton.setCSS(".s7closebutton", "display", "block");
						}
						self.container.cancelFullScreen();
					}					
				}				
				
				function updateLayout(containerWidth, containerHeight, viewHeight) {
					if (s7sdk.browser.device.name != "desktop") {
						self.zoomView.resize(containerWidth, containerHeight);
						self.divContainer.style.top = viewHeight + "px";
						self.divContainer.style.width = containerWidth + "px";
					} else {
						self.zoomView.resize(containerWidth, viewHeight);
						self.divContainer.style.top = viewHeight + "px";
						self.divContainer.style.width = containerWidth + "px";
					}
					self.swatches.resize(containerWidth, self.swatches.getHeight());
					
					if ((isNotDesktop) && (self.setindicator)) {
						resolveIndicatorVisibility();
						positionSetIndicator((containerWidth * .5) - (self.setindicator.getWidth() * .5),viewHeight + (self.setindicator.getHeight() - 10));							
					}			
				}
				
				function resizeViewer(w,h){
					self.updateOrientationMarkers();
					var hei = h;
					var wid = w * .5;
					hei = self.singleImage ? h : h - self.swatches.getHeight();

					if(self.closeButton){
						if(self.container.isFullScreen()) {
							self.closeButton.setCSS(".s7closebutton", "display", "none");
						}else{
							self.closeButton.setCSS(".s7closebutton", "display", "block");
						}
					}				
					updateLayout(w, h, hei);
				}
				
				//Container Resize handler
				function onContainerResize(event) {
					if((typeof(event.target) == 'undefined') || (event.target == document.getElementById(self.containerId+"_container"))) {
						if(!self.container.isInLayout()){
							return;
						}
						resizeViewer(event.s7event.w, event.s7event.h);
					}
				}
				//position
				function positionSetIndicator(left,top){
					//set indicator				 							
					self.setindicator.setCSS(".s7setindicator","top", (top - 20) + 'px');		
					self.setindicator.setCSS(".s7setindicator","left", left + 'px');
				}		
				function resolveIndicatorVisibility(){
					var indicator = document.getElementById(self.containerId + "_setIndicator");
					if (self.swatches.getPageCount().x <= 1){
						indicator.style.visibility = 'hidden';	
					}else{				
						indicator.style.visibility = 'inherit';	
					}
					var pages = self.swatches.getPageCount();
					if (self.indicatormode === "item"){
						self.setindicator.setNumberOfPages(self.numberOfItems);
					}else{
						self.setindicator.setNumberOfPages(pages.x);
					}			
				}			
				//Container FullScreen Resize handler
				function onContainerFullScreen(event) {
					if(self.closeButton){
						if(self.container.isFullScreen()) {
							self.closeButton.setCSS(".s7closebutton", "display", "none");
						}else{
							self.closeButton.setCSS(".s7closebutton", "display", "block");
						}
					}
					self.fullScreenButton.setSelected(self.container.isFullScreen());
					resizeViewer(event.s7event.w, event.s7event.h);
				}

				function onContainerSizeMarkerChange(event) {
					self.updateCSSMarkers();
				}
				
				function swatchSelected(e) { 
					var asset = e.s7event.asset;
					if(self.zoomView){
						self.zoomView.setItem(asset);
					}
					//
					if (self.setindicator){
						if (self.indicatormode === "item"){
							self.setindicator.setSelectedPage(e.s7event.frame);
						}else{
							self.setindicator.setSelectedPage(self.swatches.getCurrentPage().x);
						}
					}
				}
		
				function onImageChanged(e) {
					self.swatches.selectSwatch(e.s7event.frame, true);
				}
				function closeWindow() {
					try{
						if(s7sdk.browser.name != "firefox") {
							window.open(self.getContentUrl() + "s7sdkclose.html","_self"); //workaround for close self window with JS
						} else {
							window.close(); // Firefox does not allow workaround so we fall back to window.close to cover pop-up case
						} 
					}
					catch(e){
						s7sdk.Logger.log(s7sdk.Logger.WARN,"Cannot close the window");
					}
				}		
				
				function onProxyTrack(objID, compClass, instName, timeStamp, eventInfo) {
					if (self.appMeasurementBridge) {
						self.appMeasurementBridge.track(objID, compClass, instName, timeStamp, eventInfo);
					}
					if (self.handlers["trackEvent"]) {
                        if (typeof window.s7sdk == "undefined") {
                            window.s7sdk = s7sdk;
                        }
						self.handlers["trackEvent"](objID, compClass, instName, timeStamp, eventInfo);
					}
					if ("s7ComponentEvent" in window) {
						s7ComponentEvent(objID, compClass, instName, timeStamp, eventInfo);
					}
				}

			}

			this.s7params.addEventListener(s7sdk.Event.SDK_READY,function(){
													self.initSiteCatalyst(self.s7params,initViewer);
											},false);
			this.s7params.setProvidedSdk(this.sdkProvided);
			this.s7params.init();
		};

		
		s7viewers.ZoomViewer.prototype.setParam = function(key, def){
			if (this.isDisposed) return;
			this.params[key] = def;	
		};

		s7viewers.ZoomViewer.prototype.getParam = function(key){
			var keyLC = key.toLowerCase();
            for (var paramsKey in this.params) {
                if (paramsKey.toLowerCase() == keyLC) {
                    return this.params[paramsKey];
                }
            }
            return null; 
		};

		s7viewers.ZoomViewer.prototype.setParams = function(inParams){
			if (this.isDisposed) return;
			var params = inParams.split("&");
			for (var i = 0; i < params.length; i++) {
				var pair = params[i].split("=");
				if (pair.length > 1) {
					this.setParam(pair[0],decodeURIComponent(params[i].split("=")[1]));
				}
			}
		};
		
		s7viewers.ZoomViewer.prototype.s7sdkUtilsAvailable = function(){
			if (s7viewers.ZoomViewer.codebase.isDAM) {
				return typeof(s7viewers.s7sdk) != "undefined";
			} else {
				return (typeof(s7classic) != "undefined") && (typeof(s7classic.s7sdk) != "undefined");
			}
		};

		s7viewers.ZoomViewer.prototype.init = function(){
			if (this.isDisposed) return;
			if (this.initCalled) return;
			this.initCalled = true;
			if (this.initializationComplete) return this;

			var containerDiv = document.getElementById(this.containerId);
			if (containerDiv.className != ""){
				if (containerDiv.className.indexOf(s7viewers.ZoomViewer.cssClassName) != -1){
					//
				}else{
					containerDiv.className += " "+s7viewers.ZoomViewer.cssClassName;
				}	
			}else{
				containerDiv.className = s7viewers.ZoomViewer.cssClassName;
			}

			this.s7sdkNamespace = s7viewers.ZoomViewer.codebase.isDAM ? "s7viewers" : "s7classic";
			var utilSrcPath = this.getContentUrl() + this.sdkBasePath + "js/s7sdk/utils/Utils.js?namespace="+this.s7sdkNamespace;
			var allScripts = null;
			if (document.scripts){
				allScripts = document.scripts;
			}else{
				allScripts = document.getElementsByTagName("script");
			}

			if (this.s7sdkUtilsAvailable()){
				s7sdk = (s7viewers.ZoomViewer.codebase.isDAM ? s7viewers.s7sdk : s7classic.s7sdk);
				this.sdkProvided = true;
				if (this.isDisposed) {
					return;
				}
				s7sdk.Util.init(); 
				this.includeViewer(); 
				this.initializationComplete = true; 
			}else if (!this.s7sdkUtilsAvailable() && (s7viewers.ZoomViewer.codebase.isDAM ? s7viewers.S7SDK_S7VIEWERS_LOAD_STARTED : s7viewers.S7SDK_S7CLASSIC_LOAD_STARTED)){
				this.sdkProvided = true;
				var selfRef = this;
				var utilsWaitId = setInterval(
					function() {
						if (selfRef.s7sdkUtilsAvailable()) {
							clearInterval(utilsWaitId);
							s7sdk = (s7viewers.ZoomViewer.codebase.isDAM ? s7viewers.s7sdk : s7classic.s7sdk);
							if (selfRef.isDisposed) {
								return;
							}
							s7sdk.Util.init(); 
							selfRef.includeViewer();
							selfRef.initializationComplete = true;  
						}
					}, 100
				);
			}else{
				this.utilsScriptElm = document.createElement("script");
				this.utilsScriptElm.setAttribute("language", "javascript");
				this.utilsScriptElm.setAttribute("type", "text/javascript");

				var headElem = document.getElementsByTagName("head")[0];
				var self = this;

				function cleanupAndInitUtils() {
					if (!self.utilsScriptElm.executed) { 
						self.utilsScriptElm.executed = true;
						s7sdk = (s7viewers.ZoomViewer.codebase.isDAM ? s7viewers.s7sdk : s7classic.s7sdk);
						if (self.s7sdkUtilsAvailable() && s7sdk.Util){
							if (self.isDisposed) {
								return;
							}
							s7sdk.Util.init();
							self.includeViewer();  
							self.initializationComplete = true;
							self.utilsScriptElm.onreadystatechange = null;
							self.utilsScriptElm.onload = null;
							self.utilsScriptElm.onerror = null;
						}
					}  
				}

				if (typeof(self.utilsScriptElm.readyState) != "undefined") {
					self.utilsScriptElm.onreadystatechange =  function() {
						if (self.utilsScriptElm.readyState == "loaded") {
							headElem.appendChild(self.utilsScriptElm);
						} else if (self.utilsScriptElm.readyState == "complete") {
							cleanupAndInitUtils();
						}
					};
					self.utilsScriptElm.setAttribute("src", utilSrcPath);
				} else {
					self.utilsScriptElm.onload = function() {
						cleanupAndInitUtils();
					};
					self.utilsScriptElm.onerror = function() {
					};
					self.utilsScriptElm.setAttribute("src", utilSrcPath);
					headElem.appendChild(self.utilsScriptElm);
					self.utilsScriptElm.setAttribute("data-src", self.utilsScriptElm.getAttribute("src"));
					self.utilsScriptElm.setAttribute("src", "?namespace="+self.s7sdkNamespace);
				}
				if(s7viewers.ZoomViewer.codebase.isDAM) {
					s7viewers.S7SDK_S7VIEWERS_LOAD_STARTED = true;
				}else {
					s7viewers.S7SDK_S7CLASSIC_LOAD_STARTED = true;	
				}
			}
			
			return this;
		};
				
		s7viewers.ZoomViewer.prototype.getDomain = function(inUrl) {
			var res = /(^http[s]?:\/\/[^\/]+)/i.exec(inUrl);
			if (res == null) {
				return '';
			} else {
				return res[1];
			}
		};

		s7viewers.ZoomViewer.prototype.setAsset = function(inAsset) {
			if (this.isDisposed) return;
			if (this.mediaSet){
				this.mediaSet.setAsset(inAsset);
			}else{
				this.setParam("asset", inAsset);
			}
		};
		
		s7viewers.ZoomViewer.prototype.setLocalizedTexts = function(inText) {
			if (this.isDisposed) return;
			if (this.s7params){
				this.s7params.setLocalizedTexts(inText);
			}else{
				this.setParam("localizedtexts", inText);
			}
		};

		s7viewers.ZoomViewer.prototype.initSiteCatalyst = function(params,inCallback) {
				//integrate SiteCatalyst logging
				//strip modifier from asset and take the very first entry from the image list, and the first element in combination from that entry
				var siteCatalystAsset = params.get("asset", null, "MediaSet").split(',')[0].split(':')[0];
				this.isConfig2Exist = false;
				if (siteCatalystAsset.indexOf('/') != -1) {
					var company = s7sdk.MediaSetParser.findCompanyNameInAsset(siteCatalystAsset);
					var config2 = params.get("config2");
					this.isConfig2Exist = (config2 != '' && typeof config2 != "undefined");
					if (this.isConfig2Exist){
						this.trackingParams = {
							siteCatalystCompany: company,
							config2: config2,
							isRoot: params.get("serverurl")
						};
						var jsp_src =this.getContentUrl()+'../../AppMeasurementBridge.js?company=' + company + (config2 == '' ? '' : '&preset=' + config2);
						if (params.get("serverurl", null)) {
							jsp_src += "&isRoot=" + params.get("serverurl");
						}
						var elem = document.createElement("script");
						elem.setAttribute("language", "javascript");
						elem.setAttribute("type", "text/javascript");
						elem.setAttribute("src", jsp_src);

						var elems = document.getElementsByTagName("head");
						elem.onload = elem.onerror = function() {  
							if (!elem.executed) { 
								elem.executed = true;  
								if (typeof inCallback == "function"){
									inCallback();
								}
								elem.onreadystatechange = null;
								elem.onload = null;
								elem.onerror = null;
							}  
						};  

						elem.onreadystatechange = function() {  
							if (elem.readyState == "complete" || elem.readyState == "loaded") {  
								setTimeout(function() { 
									if (!elem.executed) { 
										elem.executed = true;  
										if (typeof inCallback == "function"){
											inCallback();
										}
									}  
									elem.onreadystatechange = null;
									elem.onload = null;
									elem.onerror = null;
								}, 0);
							}  
						};
						elems[0].appendChild(elem);
					}else{
						if (typeof inCallback == "function"){
							inCallback();
						}
					}	
				}
		};
		
		/**
		 * Return component within the viewer according the specified id, null if id is invalid or inapplicable.
		 * @param inId ID of the component to retrieve 
		 */
		s7viewers.ZoomViewer.prototype.getComponent = function(inId) {
			if (this.isDisposed) return null;
			switch(inId){
				case "container":
					return this.container || null;
				case "mediaSet":
					return this.mediaSet || null;
				case "zoomView":
					return this.zoomView || null;
				case "swatches":
					return this.swatches || null;
				case "setIndicator":
					return this.setindicator || null;			
				case "zoomInButton":
					return this.zoomInButton || null;
				case "zoomOutButton":
					return this.zoomOutButton || null;
				case "zoomResetButton":
					return this.zoomResetButton || null;
				case "fullScreenButton":
					return this.fullScreenButton || null;
				case "closeButton":
					return this.closeButton || null;
				case "parameterManager":
					return this.s7params || null;
				default:
					return null;
			}
		};

		/**
		 * @private
		 * Assigns handler functions by names.  This function will clear the previous handler functions on the list.
		 * Non-function entries will be ignored.
		 *
		 * @param {Object} inObj Simple JSON object containing name:function pairs.
		 */
		s7viewers.ZoomViewer.prototype.setHandlers = function(inObj) {
			if (this.isDisposed) return;
			if (this.initCalled) return;
			this.handlers = [];
			for (var i in inObj) {
				if (!inObj.hasOwnProperty(i)) continue;
				if (typeof inObj[i] != "function") continue;
				this.handlers[i] = inObj[i];
			}
		};
		s7viewers.ZoomViewer.prototype.getModifiers = function() {
			return this.modifiers;
		};

		s7viewers.ZoomViewer.prototype.setModifier = function(modifierObject) {
			if (this.isDisposed) return;
			var modName, modDesc, modObj, modVal, parsedModifier, i;
			for(modName in modifierObject) {
				if(!this.modifiers.hasOwnProperty(modName)) {
					continue;
				}
				modDesc = this.modifiers[modName];
				
				try {
					modVal = modifierObject[modName];

					if (modDesc.parseParams === false) {
						parsedModifier = new s7sdk.Modifier([modVal  != "" ? modVal : modDesc.defaults[0]]);
					} else {
						parsedModifier = s7sdk.Modifier.parse(modVal, modDesc.defaults, modDesc.ranges);
					}

					if(parsedModifier.values.length == 1) {
						this[modName] = parsedModifier.values[0];
						this.setModifierInternal(modName);
					}
					else if(parsedModifier.values.length > 1) {
						modObj = {};
						for(i = 0; i < parsedModifier.values.length; i++) {
							modObj[modDesc.params[i]] = parsedModifier.values[i];
						}
						this[modName] = modObj;
						this.setModifierInternal(modName);
					}
				}
				catch(error) {
					throw new Error("Unable to process modifier: '"+ modName + "'. " + error);
				}
			}
		};

		s7viewers.ZoomViewer.prototype.setModifierInternal = function(modName) {
			switch (modName) {
				default :
					break;				
			}
		};

		s7viewers.ZoomViewer.prototype.parseMods = function () {
			var modName, modDesc, modObj, modVal, parsedModifier, i;
			
			for(modName in this.modifiers) {
				if(!this.modifiers.hasOwnProperty(modName)) {
					continue;
				}
				modDesc = this.modifiers[modName];
				
				try {
					modVal = this.s7params.get(modName, "");

					if (modDesc.parseParams === false) {
						parsedModifier = new s7sdk.Modifier([modVal  != "" ? modVal : modDesc.defaults[0]]);
					} else {
						parsedModifier = s7sdk.Modifier.parse(modVal, modDesc.defaults, modDesc.ranges);
					}

					if(parsedModifier.values.length == 1) {
						this[modName] = parsedModifier.values[0];
					}
					else if(parsedModifier.values.length > 1) {
						modObj = {};
						for(i = 0; i < parsedModifier.values.length; i++) {
							modObj[modDesc.params[i]] = parsedModifier.values[i];
						}
						this[modName] = modObj;
					}
				}
				catch(error) {
					throw new Error("Unable to process modifier: '"+ modName + "'. " + error);
				}
			}
		};

		/**
		 * @private
		 */
		s7viewers.ZoomViewer.prototype.updateCSSMarkers = function (){
			var sizeMarker = this.container.getSizeMarker();
			var newclass;
			if (sizeMarker == s7sdk.common.Container.SIZE_MARKER_NONE){
				return;
			}		
			if (sizeMarker == s7sdk.common.Container.SIZE_MARKER_LARGE){
				newclass = "s7size_large";
			}else{
				if (sizeMarker == s7sdk.common.Container.SIZE_MARKER_SMALL){
					newclass = "s7size_small";
				}else if (sizeMarker == s7sdk.common.Container.SIZE_MARKER_MEDIUM){
					newclass = "s7size_medium";
				}
			}
			if (this.containerId) {
				this.setNewSizeMarker(this.containerId, newclass);
			}
			this.reloadInnerComponents();
		};
		
		s7viewers.ZoomViewer.prototype.reloadInnerComponents = function () {
			var regCompArr = this.s7params.getRegisteredComponents();
			for(var i=0; i < regCompArr.length; i++){
				if (regCompArr[i] && regCompArr[i].restrictedStylesInvalidated()){
					regCompArr[i].reload();
				}
			}
		};
		
		s7viewers.ZoomViewer.prototype.setNewSizeMarker = function (elm, inClass) {
			var cls = document.getElementById(elm).className;
			var re = /^(.*)(s7size_small|s7size_medium|s7size_large)(.*)$/gi;
			var newcls;
			if(cls.match(re)){
				newcls = cls.replace(re,  "$1" + inClass + "$3");
			} else {
				newcls = cls + " " + inClass;
			}
			if(cls != newcls){
				document.getElementById(elm).className = newcls;
			}
		};

		s7viewers.ZoomViewer.prototype.dispose = function () {
			if (this.appMeasurementBridge) {
				this.appMeasurementBridge.dispose();
				this.appMeasurementBridge = null;
			}
			if (this.trackingManager){
				this.trackingManager.dispose();
				this.trackingManager = null;
			}
			if (this.visibilityManagerZoom){
				this.visibilityManagerZoom.dispose();
				this.visibilityManagerZoom = null;
			}
			if (this.setindicator){
				this.setindicator.dispose();
				this.setindicator = null;
			}
			if (this.swatches){
				this.swatches.dispose();
				this.swatches = null;
			}
			if (this.zoomView){
				this.zoomView.dispose();
				this.zoomView = null;
			}
			if (this.zoomInButton){
				this.zoomInButton.dispose();
				this.zoomInButton = null;
			}
			if (this.zoomOutButton){
				this.zoomOutButton.dispose();
				this.zoomOutButton = null;
			}
			if (this.zoomResetButton){
				this.zoomResetButton.dispose();
				this.zoomResetButton = null;
			}
			if (this.fullScreenButton){
				this.fullScreenButton.dispose();
				this.fullScreenButton = null;
			}
			if (this.closeButton){
				this.closeButton.dispose();
				this.closeButton = null;
			}
			if (this.mediaSet){
				this.mediaSet.dispose();
				this.mediaSet = null;
			}
			if (this.s7params){
				this.s7params.dispose();
				this.s7params = null;
			}
			if (this.divContainer){
				this.divContainer.parentNode.removeChild(this.divContainer);	
				delete this.divContainer
			}
			if (this.container){
				var classes = [s7viewers.ZoomViewer.cssClassName,"s7touchinput","s7mouseinput","s7size_large","s7size_small","s7size_medium"];
				var cls = document.getElementById(this.containerId).className.split(' ');
				for(var i=0; i<classes.length;i++){
					var idx = cls.indexOf(classes[i]);
					if(idx != -1) { 
						cls.splice(idx, 1);
					}
				}
				document.getElementById(this.containerId).className = cls.join(' ');
				this.container.dispose();
				this.container = null;
			}
			this.handlers = [];
			this.isDisposed = true;
		};

		/**
		 * @private
		 */	
		s7viewers.ZoomViewer.prototype.updateOrientationMarkers = function (){
			if(!this.isOrientationMarkerForcedChanged){
				var newclass;
				if (window.innerWidth > window.innerHeight){
					newclass = "s7device_landscape";
				}else{
					newclass = "s7device_portrait";
				}			
				if (document.getElementById(this.containerId).className.indexOf(newclass) == -1) {
					this.setNewOrientationMarker(this.containerId, newclass);
					this.reloadInnerComponents();
				}
			}
		};
		
		s7viewers.ZoomViewer.prototype.setNewOrientationMarker = function (elm, inClass) {
			var cls = document.getElementById(elm).className;
			var re = /^(.*)(s7device_landscape|s7device_portrait)(.*)$/gi;
			var newcls;
			if(cls.match(re)){
				newcls = cls.replace(re,  "$1" + inClass + "$3");
			} else {
				newcls = cls + " " + inClass;
			}
			if(cls != newcls){
				document.getElementById(elm).className = newcls;
			}
		};

		s7viewers.ZoomViewer.prototype.forceDeviceOrientationMarker = function (marker){
			switch (marker){
				case "s7device_portrait":
				case "s7device_landscape":
					this.isOrientationMarkerForcedChanged = true;
					if (this.containerId) {
						this.setNewOrientationMarker(this.containerId, marker);
					}
					this.reloadInnerComponents();
					break;
				case null:
					this.isOrientationMarkerForcedChanged = false;
					this.updateOrientationMarkers();
					break;
				default:
					break;
			}
		};

		s7viewers.ZoomViewer.prototype.getURLParameter = function (name) {
			return decodeURIComponent((new RegExp('[?|&]' + name + '=([^&;]+?)(&|#|;|$)','gi').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
		};

		s7viewers.ZoomViewer.prototype.addClass = function (elm, inClass) {
			var cls = document.getElementById(elm).className.split(' ');
			if(cls.indexOf(inClass) == -1) {
				cls[cls.length] = inClass;
				document.getElementById(elm).className = cls.join(' ');
			}
		};

	})();	
}
