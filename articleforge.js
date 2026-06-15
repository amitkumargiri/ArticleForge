
(function (global) {
  "use strict";

  const FONT_SIZES = [10,12,14,16,18,20,24,28,32,36,48];

  const COLORS = [
    "#000000","#434343","#666666","#999999","#cccccc","#ffffff",
    "#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#0000ff",
    "#9900ff","#ff00ff","#f44336","#2196f3","#4caf50","#ffeb3b"
  ];

  const CSS = `
  .af-wrapper{
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    border:1px solid #d0d5dd;
    border-radius:14px;
    background:#fff;
    display:flex;
    flex-direction:column;
    position:relative;
    overflow:visible;
    box-shadow:0 2px 10px rgba(0,0,0,.05);
  }

  .af-wrapper.af-fullscreen{
    position:fixed;
    inset:0;
    z-index:999999;
    border-radius:0;
  }

  .af-toolbar{
    display:flex;
    align-items:center;
    flex-wrap:wrap;
    gap:6px;
    padding:14px 16px;
    border-bottom:1px solid #e5e7eb;
    background:#fafafa;
  }

  .af-toolbar button,
  .af-toolbar select{
    border:1px solid #d1d5db;
    background:#fff;
    border-radius:10px;
    height:36px;
    padding:0 12px;
    cursor:pointer;
    font-size:14px;
    color:#374151;
  }

  .af-toolbar button:hover,
  .af-toolbar select:hover{
    background:#f3f4f6;
  }

  .af-toolbar button.active{
      background:#e0e7ff;
      border-color:#6366f1;
      color:#4338ca;
  }

  .af-sep{
    width:1px;
    height:22px;
    background:#d1d5db;
    margin:0 4px;
  }

  .af-editor{
    min-height:420px;
    padding:28px 32px;
    outline:none;
    font-size:16px;
    line-height:1.8;
    color:#111827;
  }

  .af-editor:empty::before{
    content:attr(data-placeholder);
    color:#9ca3af;
  }

  .af-statusbar{
    display:flex;
    justify-content:space-between;
    padding:8px 16px;
    border-top:1px solid #e5e7eb;
    background:#fafafa;
    font-size:12px;
    color:#6b7280;
  }

  .af-color-picker{
    position:fixed;
    background:#fff;
    border:1px solid #d1d5db;
    border-radius:12px;
    padding:10px;
    display:grid;
    grid-template-columns:repeat(6,24px);
    gap:6px;
    z-index:999999;
    box-shadow:0 10px 30px rgba(0,0,0,.15);
  }

  
  .af-color-btn{
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:2px;
    min-width:42px;
  }

  .af-color-letter{
    font-weight:700;
    line-height:1;
  }

  .af-color-indicator{
    width:16px;
    height:3px;
    border-radius:2px;
    background:#000000;
  }

  .af-color-swatch{
    width:24px;
    height:24px;
    border-radius:6px;
    cursor:pointer;
    border:1px solid rgba(0,0,0,.1);
  }

  .af-preview-modal{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.5);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:999999;
  }

  .af-preview-content{
    background:#fff;
    width:min(900px,95vw);
    height:min(90vh,900px);
    border-radius:12px;
    overflow:auto;
    padding:30px;
  }
  `;

  class ArticleForge {

    static init(selector = ".articleforge") {
      document.querySelectorAll(selector).forEach(el => {
        if (!el._articleForge) {
          el._articleForge = new ArticleForge(el);
        }
      });
    }

    constructor(mountEl) {
      this.mount = mountEl;
      this._savedRange = null;
      this._colorPicker = null;
      this._isFullscreen = false;

      this._injectCSS();
      this._build();
      this._bindEvents();
    }

    _injectCSS() {
      if (document.getElementById("articleforge-style")) return;

      const style = document.createElement("style");
      style.id = "articleforge-style";
      style.textContent = CSS;

      document.head.appendChild(style);
    }

    _build() {

      this.mount.innerHTML = "";

      this.wrapper = document.createElement("div");
      this.wrapper.className = "af-wrapper";

      this.wrapper.innerHTML = `
        <div class="af-toolbar">

          <button type="button" data-cmd="fullscreen" title="Fullscreen">Fullscreen</button>

          <div class="af-sep"></div>

          <select data-cmd="formatBlock">
            <option value="p">Paragraph</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="h4">H4</option>
            <option value="h5">H5</option>
            <option value="h6">H6</option>
          </select>

          <select data-cmd="fontSize">
            ${FONT_SIZES.map(size =>
              `<option value="${size}" ${size===16 ? 'selected' : ''}>${size}px</option>`
            ).join("")}
          </select>

          <div class="af-sep"></div>

          <button type="button" data-cmd="bold"><b>B</b></button>
          <button type="button" data-cmd="italic"><i>I</i></button>
          <button type="button" data-cmd="underline"><u>U</u></button>

          <div class="af-sep"></div>

          <button type="button" data-cmd="color" class="af-color-btn">
            <span class="af-color-letter">A</span>
            <span class="af-color-indicator"></span>
          </button>

          <div class="af-sep"></div>

          <button type="button" data-cmd="justifyLeft" title="Align Left">Left</button>
          <button type="button" data-cmd="justifyCenter" title="Align Center">Center</button>
          <button type="button" data-cmd="justifyRight" title="Align Right">Right</button>
          <button type="button" data-cmd="justifyFull" title="Justify">Justify</button>

          <div class="af-sep"></div>

          <button type="button" data-cmd="insertUnorderedList">- List</button>
          <button type="button" data-cmd="insertOrderedList">1. List</button>

          <div class="af-sep"></div>

          <button type="button" data-cmd="insertImage">Image</button>

          <button type="button" data-cmd="preview" style="margin-left:auto;">
            Preview
          </button>

        </div>

        <div
          class="af-editor"
          contenteditable="true"
          data-placeholder="Write your article..."
        ></div>

        <div class="af-statusbar">
          <span class="af-wordcount">0 words</span>
          <span class="af-charcount">0 chars</span>
        </div>
      `;

      this.mount.appendChild(this.wrapper);

      this.editor = this.wrapper.querySelector(".af-editor");
    }

    _bindEvents() {

      const toolbar = this.wrapper.querySelector(".af-toolbar");

      toolbar.addEventListener("mousedown", e => {

        const btn = e.target.closest("button[data-cmd]");

        if (!btn) return;

        e.preventDefault();

        this._saveRange();

        this._dispatch(btn.dataset.cmd, btn);
      });

      toolbar.querySelectorAll("select").forEach(sel => {

        sel.addEventListener("change", () => {

          this._restoreRange();

          this._dispatch(sel.dataset.cmd, sel);

          this.editor.focus();
        });
      });

      this.editor.addEventListener("mouseup", () => {
        this._saveRange();
      });

      this.editor.addEventListener("keyup", () => {
        this._saveRange();
      });

      this.editor.addEventListener("input", () => {
        this._updateCounts();
      });

      this.editor.addEventListener("keydown", e => {

          if (!e.ctrlKey) return;

          switch (e.key.toLowerCase()) {

            case "b":
              e.preventDefault();
              document.execCommand("bold");
              break;

            case "i":
              e.preventDefault();
              document.execCommand("italic");
              break;

            case "u":
              e.preventDefault();
              document.execCommand("underline");
              break;
          }

          this._updateToolbarState();
      });

      document.addEventListener("selectionchange", () => {

          const sel = window.getSelection();

          if (!sel.rangeCount) return;

          const node = sel.anchorNode;

          if (!this.editor.contains(node)) return;

          this._saveRange();

          requestAnimationFrame(() => {
            this._updateToolbarState();
          });
      });
    }

    _dispatch(cmd, el) {

      this._restoreRange();

      switch(cmd){

        case "bold":
        case "italic":
        case "underline":
        case "justifyLeft":
        case "justifyCenter":
        case "justifyRight":
        case "justifyFull":
        case "insertUnorderedList":
        case "insertOrderedList":

          document.execCommand(cmd,false,null);
          this._updateToolbarState();
          break;

        case "formatBlock":
          document.execCommand("formatBlock", false, el.value);
          break;

        case "fontSize":
          this._applyFontSize(el.value + "px");
          return;

        case "color":
          this._toggleColorPicker(el);
          return;

        case "insertImage":
          this._insertImage();
          return;

        case "preview":
          this._showPreview();
          return;

        case "fullscreen":
          this._toggleFullscreen();
          return;
      }

      this.editor.focus();

      this._updateCounts();
    }

    _applyFontSize(size){

      const sel = window.getSelection();

      if(!sel || !sel.rangeCount) return;

      const range = sel.getRangeAt(0);

      if(range.collapsed) return;

      const span = document.createElement("span");

      span.style.fontSize = size;

      try{
        range.surroundContents(span);
      }catch{
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }

      this.editor.focus();
    }

    _toggleColorPicker(anchorBtn){

      if(this._colorPicker){
        this._dismissColorPicker();
        return;
      }

      const picker = document.createElement("div");

      picker.className = "af-color-picker";

      picker.innerHTML = COLORS.map(c => `
        <div
          class="af-color-swatch"
          style="background:${c}"
          data-color="${c}">
        </div>
      `).join("");

      picker.addEventListener("mousedown", e => {

        const sw = e.target.closest(".af-color-swatch");

        if(!sw) return;

        e.preventDefault();

        this._restoreRange();

        document.execCommand("styleWithCSS", false, true);

        document.execCommand(
          "foreColor",
          false,
          sw.dataset.color
        );

        const indicator = this.wrapper.querySelector(".af-color-indicator");

        if(indicator){
          indicator.style.background = sw.dataset.color;
        }

        this._dismissColorPicker();

        this.editor.focus();
      });

      const rect = anchorBtn.getBoundingClientRect();

      picker.style.top = (rect.bottom + 8) + "px";
      picker.style.left = rect.left + "px";

      document.body.appendChild(picker);

      this._colorPicker = picker;
    }

    _dismissColorPicker(){

      if(this._colorPicker){
        this._colorPicker.remove();
        this._colorPicker = null;
      }
    }

    _insertImage(){

      const url = prompt("Enter image URL");

      if(!url) return;

      document.execCommand(
        "insertImage",
        false,
        url
      );
    }

    _showPreview(){

      const modal = document.createElement("div");

      modal.className = "af-preview-modal";

      modal.innerHTML = `
        <div class="af-preview-content">
          ${this.getHTML()}
        </div>
      `;

      modal.addEventListener("click", e => {
        if(e.target === modal){
          modal.remove();
        }
      });

      document.body.appendChild(modal);
    }

    _toggleFullscreen(){

      this._isFullscreen = !this._isFullscreen;

      this.wrapper.classList.toggle(
        "af-fullscreen",
        this._isFullscreen
      );
    }

    _saveRange(){

      const sel = window.getSelection();

      if(sel && sel.rangeCount){
        this._savedRange = sel.getRangeAt(0).cloneRange();
      }
    }

    _restoreRange(){

      if(!this._savedRange) return;

      const sel = window.getSelection();

      sel.removeAllRanges();

      sel.addRange(this._savedRange);
    }

    _updateCounts(){

      const text = this.editor.innerText || "";

      const words = text.trim()
        ? text.trim().split(/\s+/).length
        : 0;

      const chars = text.length;

      this.wrapper.querySelector(".af-wordcount")
        .textContent = words + " words";

      this.wrapper.querySelector(".af-charcount")
        .textContent = chars + " chars";
    }

    _updateToolbarState() {

      const toolbar = this.wrapper.querySelector(".af-toolbar");

      const toggle = (cmd, selector) => {
        const btn = toolbar.querySelector(selector);

        if (!btn) return;

        btn.classList.toggle(
          "active",
          document.queryCommandState(cmd)
        );
      };

      // Formatting buttons
      toggle("bold", '[data-cmd="bold"]');
      toggle("italic", '[data-cmd="italic"]');
      toggle("underline", '[data-cmd="underline"]');

      // Alignment buttons
      [
        "justifyLeft",
        "justifyCenter",
        "justifyRight",
        "justifyFull"
      ].forEach(cmd => {

        const btn = toolbar.querySelector(
          `[data-cmd="${cmd}"]`
        );

        if (!btn) return;

        btn.classList.toggle(
          "active",
          document.queryCommandState(cmd)
        );
      });

      this._updateHeadingDropdown();
      this._updateFontSizeDropdown();
      this._updateColorIndicator();
    }

    _updateHeadingDropdown() {

      const sel = window.getSelection();

      if (!sel.rangeCount) return;

      let node = sel.anchorNode;

      if (node.nodeType === 3) {
        node = node.parentElement;
      }

      const heading = node.closest(
        "h1,h2,h3,h4,h5,h6,p"
      );

      if (!heading) return;

      const select = this.wrapper.querySelector(
        'select[data-cmd="formatBlock"]'
      );

      select.value = heading.tagName.toLowerCase();
    }

    _updateFontSizeDropdown() {

      const sel = window.getSelection();

      if (!sel.rangeCount) return;

      let node = sel.anchorNode;

      if (node.nodeType === 3) {
        node = node.parentElement;
      }

      const size = parseInt(
        window.getComputedStyle(node).fontSize
      );

      const select = this.wrapper.querySelector(
        'select[data-cmd="fontSize"]'
      );

      const closest = FONT_SIZES.reduce(
        (a,b)=>
          Math.abs(b-size) < Math.abs(a-size)
          ? b
          : a
      );

      select.value = closest;
    }

    _updateColorIndicator() {

      const sel = window.getSelection();

      if (!sel.rangeCount) return;

      let node = sel.anchorNode;

      if (node.nodeType === 3) {
        node = node.parentElement;
      }

      const color = window
        .getComputedStyle(node)
        .color;

      const indicator = this.wrapper.querySelector(
        ".af-color-indicator"
      );

      if (indicator) {
        indicator.style.background = color;
      }
    }

    getHTML(){
      return this.editor.innerHTML;
    }

    setHTML(html){
      this.editor.innerHTML = html;
    }

    clear(){
      this.editor.innerHTML = "";
    }
  }

  global.ArticleForge = ArticleForge;

  if(document.readyState === "loading"){
    document.addEventListener(
      "DOMContentLoaded",
      () => ArticleForge.init()
    );
  }else{
    ArticleForge.init();
  }

  document.addEventListener("selectionchange", () => {

      if (!this.editor.contains(document.activeElement) &&
          !this.editor.contains(window.getSelection()?.anchorNode)) {
        return;
      }

      this._updateToolbarState();
  });

})(window);