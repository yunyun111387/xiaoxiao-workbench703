/* ============================================
   鏅撴檽瀹氬埗鐗?v4 - Application Layer
   ============================================ */

const App = {
  state: {
    view: 'dashboard',
    detail: null,
    history: [],
    data: null,
    newsActiveTab: 'politics',
    newsData: {},
    newsLoading: {},
    shanghaiTab: 'hotspot',
    examDailyIdx: 0,
    policyIdx: 0,
    frameworkExampleIdx: 0,
    studentFilter: 'all',
    studentSearch: '',
    quizIdx: 0,
    quizAnswered: false,
    quizSelected: -1,
    meetingFiles: { photos: [], docs: [] },
    meetingAgendas: [],
    resumeFile: null,
    subView: null,
  },

  store: {
    key: 'xx_workstation_v4',
    version: 5,
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
        const data = JSON.parse(raw);
        if (!data.version || data.version < this.version) {
          const merged = JSON.parse(JSON.stringify(DEFAULT_DATA));
          for (const k in merged) {
            if (data[k] !== undefined) merged[k] = data[k];
          }
          merged.version = this.version;
          merged.createdAt = data.createdAt || new Date().toISOString();
          return merged;
        }
        for (const k in DEFAULT_DATA) {
          if (data[k] === undefined) data[k] = JSON.parse(JSON.stringify(DEFAULT_DATA[k]));
        }
        return data;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
    },
    save() {
      try {
        localStorage.setItem(this.key, JSON.stringify(App.state.data));
      } catch (e) {
        App.utils.toast('瀛樺偍澶辫触');
      }
    },
  },

  utils: {
    formatDate(d) {
      if (!d) return '';
      const date = typeof d === 'string' ? new Date(d) : d;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
    formatDateTime(d) {
      const date = d ? new Date(d) : new Date();
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${h}:${min}`;
    },
    todayKey() {
      return this.formatDate(new Date());
    },
    uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },
    toast(msg) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      container.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity .3s';
        setTimeout(() => el.remove(), 300);
      }, 2500);
    },
    getDaily(arr) {
      if (!arr || !arr.length) return null;
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 0);
      const diff = today - start;
      const dayOfYear = Math.floor(diff / 86400000);
      return arr[dayOfYear % arr.length];
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    escape(s) {
      if (s == null) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    nl2br(s) {
      return this.escape(s).replace(/\n/g, '<br>');
    },
    getModule(id) {
      return MODULES.find(m => m.id === id) || MODULES[0];
    },
    openUrl(url) {
      if (url) window.open(url, '_blank');
    },
    colorForStatus(status) {
      const s = STATUS_MAP[status];
      return s ? s.color : '#E8F4F8';
    },
    textColorForStatus(status) {
      const s = STATUS_MAP[status];
      return s ? s.text : '#6B7C8D';
    },
    labelForStatus(status) {
      const s = STATUS_MAP[status];
      return s ? s.label : status;
    },
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, 'UTF-8');
      });
    },
    formatSize(bytes) {
      if (!bytes) return '0B';
      if (bytes < 1024) return bytes + 'B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
      return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    },
    extractFirstLine(text, maxLen) {
      if (!text) return '';
      const line = text.split('\n')[0].trim();
      if (line.length > maxLen) return line.substring(0, maxLen) + '...';
      return line;
    },
    extractTopicTitle(paragraph, idx) {
      if (!paragraph) return '璁 ' + (idx + 1);
      const trimmed = paragraph.trim();
      // Try to find a sentence ending with  銆傦紒锛?that's short enough
      const firstSentence = trimmed.match(/^(.{2,40})[銆傦紒锛燂紝,]/);
      if (firstSentence) return firstSentence[1].trim();
      // Take first line or first 30 chars
      const firstLine = trimmed.split('\n')[0].trim();
      if (firstLine.length <= 40) return firstLine;
      return firstLine.substring(0, 35) + '...';
    },
    segmentContent(text) {
      if (!text || !text.trim()) return [];
      const segments = [];
      const lines = text.split('\n');
      let currentBlock = { type: 'topic', title: '', content: '' };
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (currentBlock.content) {
            segments.push({ ...currentBlock });
            currentBlock = { type: 'topic', title: '', content: '' };
          }
          continue;
        }
        // Detect section headers
        if (/^(璁|璁▼|璁ㄨ|涓婚|Topic|Agenda)[:锛歕d涓€浜屼笁鍥涗簲鍏竷鍏節鍗乚/.test(trimmed)) {
          if (currentBlock.content) segments.push({ ...currentBlock });
          currentBlock = { type: 'topic', title: trimmed.substring(0, 50), content: '' };
          continue;
        }
        if (/^(鍐宠|鍐冲畾|閫氳繃|Decision|Resolution)[:锛歕d]/.test(trimmed)) {
          if (currentBlock.content) segments.push({ ...currentBlock });
          currentBlock = { type: 'decision', title: trimmed.substring(0, 50), content: '' };
          continue;
        }
        if (/^(涓嬩竴姝寰呭姙|璺熻繘|琛屽姩璁″垝|Action|Task|TODO)[:锛歕d]/.test(trimmed)) {
          if (currentBlock.content) segments.push({ ...currentBlock });
          currentBlock = { type: 'action', title: trimmed.substring(0, 50), content: '' };
          continue;
        }
        // Check for decision-like content
        if (/(?:鍐冲畾|鍐宠|閫氳繃|纭|鍚屾剰|鎵瑰噯|鏄庣‘|瑕佹眰|鎸囧嚭)[:锛歖/.test(trimmed) && currentBlock.type !== 'decision') {
          if (currentBlock.content) segments.push({ ...currentBlock });
          currentBlock = { type: 'decision', title: '', content: trimmed };
          continue;
        }
        // Check for action-like content
        if (/(?:涓嬩竴姝寰呭姙|璺熻繘|钀藉疄|鎺ㄨ繘|瀹屾垚|璐熻矗|鎴|鏈熼檺)/.test(trimmed) && currentBlock.type !== 'action') {
          if (currentBlock.content) segments.push({ ...currentBlock });
          currentBlock = { type: 'action', title: '', content: trimmed };
          continue;
        }
        if (!currentBlock.title && trimmed.length < 50) {
          currentBlock.title = trimmed;
        }
        currentBlock.content += (currentBlock.content ? '\n' : '') + trimmed;
      }
      if (currentBlock.content) segments.push({ ...currentBlock });
      return segments;
    },
    summarizeContent(text, maxLen) {
      if (!text || !text.trim()) return '';
      const clean = text.replace(/\s+/g, ' ').trim();
      if (clean.length <= maxLen) return clean;
      // Try to break at sentence boundary
      const truncated = clean.substring(0, maxLen);
      const lastPeriod = Math.max(truncated.lastIndexOf('銆?), truncated.lastIndexOf('锛?), truncated.lastIndexOf('锛?));
      if (lastPeriod > maxLen * 0.5) {
        return truncated.substring(0, lastPeriod + 1);
      }
      return truncated.substring(0, truncated.lastIndexOf(' ') > 0 ? truncated.lastIndexOf(' ') : maxLen - 3) + '...';
    },
  },

  /* ====== Navigation ====== */
  navigate(view) {
    this.state.detail = null;
    this.state.subView = null;
    this.state.history.push({ view: this.state.view, detail: this.state.detail, subView: this.state.subView });
    this.state.view = view;
    this.renderSidebar();
    this.render();
    document.getElementById('content').scrollTop = 0;
  },

  showDetail(type, id) {
    this.state.history.push({ view: this.state.view, detail: this.state.detail, subView: this.state.subView });
    this.state.detail = { type, id };
    this.renderTopbar();
    this.render();
    document.getElementById('content').scrollTop = 0;
  },

  goBack() {
    const prev = this.state.history.pop();
    if (prev) {
      this.state.view = prev.view;
      this.state.detail = prev.detail;
      this.state.subView = prev.subView;
    } else {
      this.state.detail = null;
      this.state.subView = null;
    }
    this.renderSidebar();
    this.render();
    document.getElementById('content').scrollTop = 0;
  },

  setSubView(sv) {
    this.state.history.push({ view: this.state.view, detail: this.state.detail, subView: this.state.subView });
    this.state.subView = sv;
    this.state.detail = null;
    this.renderTopbar();
    this.render();
    document.getElementById('content').scrollTop = 0;
  },

  /* ====== Modal ====== */
  showModal(html) {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modal-overlay');
    modal.innerHTML = html;
    overlay.classList.add('active');
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
  },

  /* ====== Init ====== */
  init() {
    this.state.data = this.store.load();
    this.renderSidebar();
    this.render();
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') this.closeModal();
    });
    this.fetchNews('politics');
    this.fetchNews('social');
  },

  /* ====== Sidebar ====== */
  renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    let html = '<div class="sidebar-logo">鏅?/div><nav class="sidebar-nav">';
    MODULES.forEach(m => {
      const active = this.state.view === m.id && !this.state.detail ? 'active' : '';
      const style = active ? `background:${m.color};color:#fff` : '';
      html += `<button class="nav-item ${active}" onclick="App.navigate('${m.id}')">
        <div class="nav-icon" style="${active ? `background:${m.color}33` : ''}">${m.emoji}</div>
        <span class="nav-label">${m.short}</span>
      </button>`;
    });
    html += '</nav><div class="sidebar-bottom">';
    html += `<button class="sidebar-btn" onclick="App.showAbout()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <span>鍏充簬</span>
    </button>`;
    html += '</div>';
    sidebar.innerHTML = html;
  },

  showAbout() {
    this.showModal(`<div class="modal-header">
      <div class="modal-title">鍏充簬宸ヤ綔鍙?/div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div style="text-align:center;padding:10px 0 20px">
      <div style="font-size:48px;margin-bottom:12px">馃彔</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:6px">鏅撴檽瀹氬埗鐗?路 涓汉AI宸ヤ綔鍙?/div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Version 4.0 路 鏁版嵁鏈湴瀛樺偍</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.8">
        闆嗘垚鎬昏銆佸氨涓氥€佽亴涓氥€佺鐮斻€佸叕鑰冦€佺敓娲汇€佸搴竷澶фā鍧?br>
        涓烘檽鏅撻噺韬墦閫犵殑鍏ㄨ兘宸ヤ綔鍔╂墜
      </div>
    </div>`);
  },

  /* ====== Topbar ====== */
  renderTopbar(opts) {
    opts = opts || {};
    const topbar = document.getElementById('topbar');
    const showBack = opts.showBack !== false && (this.state.history.length > 0 || this.state.detail || this.state.subView);
    const title = opts.title || (this.state.detail ? '璇︽儏' : (this.utils_getModule(this.state.view) ? this.utils_getModule(this.state.view).name : ''));
    let html = `<button class="back-btn ${showBack ? 'visible' : ''}" onclick="App.goBack()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
    </button>`;
    html += `<div class="topbar-title">${this.utils.escape(title)}</div>`;
    html += '<div class="topbar-right">';
    if (opts.refresh) {
      html += `<button class="topbar-btn" onclick="App.${opts.refreshAction || 'refreshCurrent'}()" id="topbar-refresh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      </button>`;
    }
    html += '</div>';
    topbar.innerHTML = html;
  },

  utils_getModule(id) {
    return MODULES.find(m => m.id === id) || null;
  },

  refreshCurrent() {
    if (this.state.view === 'dashboard') {
      this.refreshNews();
      this.refreshKnowledge();
    }
  },

  /* ====== Main Render ====== */
  render() {
    if (this.state.detail) {
      this.renderDetail();
      return;
    }
    if (this.state.subView) {
      this.renderSubView();
      return;
    }
    const view = this.state.view;
    const module = this.utils.getModule(view);
    const title = module ? module.name : '';
    this.renderTopbar({ title });
    const content = document.getElementById('content');
    content.className = 'fade-in';
    switch (view) {
      case 'dashboard': this.viewDashboard(content); break;
      case 'employment': this.viewEmployment(content); break;
      case 'career': this.viewCareer(content); break;
      case 'research': this.viewResearch(content); break;
      case 'exam': this.viewExam(content); break;
      case 'life': this.viewLife(content); break;
      case 'family': this.viewFamily(content); break;
      default: content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">馃攳</div>椤甸潰涓嶅瓨鍦?/div>';
    }
  },

  /* ====== Dashboard View ====== */
  viewDashboard(el) {
    const m = MODULES[0];
    let html = `<div class="hero fade-in" style="background:linear-gradient(135deg,${m.color},${m.colorDark})">
      <div class="hero-deco"></div><div class="hero-deco2"></div>
      <div class="hero-title">鏅撴檽锛屼粖澶╀篃瑕佸姞娌瑰憖 鈽€锔?/div>
      <div class="hero-sub">${this.utils.formatDateTime(new Date())}</div>
    </div>`;

    // Daily Knowledge
    html += '<div class="section-title"><span class="emoji">馃挕</span>姣忔棩鐭ヨ瘑</div>';
    let knowledgeItems = this.state.knowledgeShuffled || DAILY_KNOWLEDGE.slice(0, 4);
    if (!this.state.knowledgeShuffled) {
      knowledgeItems = this.utils.shuffle(DAILY_KNOWLEDGE).slice(0, 4);
      this.state.knowledgeShuffled = knowledgeItems;
    }
    html += '<div class="grid grid-2">';
    knowledgeItems.forEach((k, i) => {
      const realIdx = DAILY_KNOWLEDGE.indexOf(k);
      html += `<div class="card clickable" onclick="App.showDetail('knowledge',${realIdx})">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:24px">${k.emoji}</span>
          <span class="badge" style="background:var(--primary-light);color:var(--primary-dark)">${this.utils.escape(k.cat)}</span>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px">${this.utils.escape(k.title)}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5">${this.utils.escape(k.summary)}</div>
      </div>`;
    });
    html += '</div>';
    const updateTime = this.state.data.knowledgeLastUpdate || this.utils.formatDateTime(new Date());
    html += `<div class="news-refresh-info">鏈€鍚庢洿鏂帮細${this.utils.escape(updateTime)} 路 <a href="javascript:App.refreshKnowledge()" style="color:var(--primary-dark);font-weight:600">鎹竴鎵?/a></div>`;

    // News
    html += '<div class="section-title"><span class="emoji">馃摪</span>鏂伴椈璧勮 <button class="refresh-btn" onclick="App.refreshNews()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:var(--primary-dark);cursor:pointer">馃攧 鍒锋柊</button></div>';
    html += '<div class="news-card">';
    const tabs = [
      { key: 'politics', label: '鏃舵斂' },
      { key: 'social', label: '绀句細' },
      { key: 'education', label: '鏁欒偛' },
      { key: 'employment', label: '灏变笟' },
      { key: 'exam', label: '鍏€? },
    ];
    html += '<div class="news-tabs">';
    tabs.forEach(t => {
      const active = this.state.newsActiveTab === t.key ? 'active' : '';
      const color = active ? `background:${MODULES[1].colorDark}` : '';
      html += `<div class="news-tab ${active}" style="${active ? `background:${MODULES[1].colorDark}` : ''}" onclick="App.switchNewsTab('${t.key}')">${t.label}</div>`;
    });
    html += '</div>';
    html += `<div id="news-panel">${this.renderNewsPanel()}</div>`;
    html += '</div>';

    // Social Platforms
    html += '<div class="section-title"><span class="emoji">馃寪</span>绀句氦骞冲彴</div>';
    html += '<div class="grid grid-2">';
    SOCIAL_PLATFORMS.forEach(p => {
      html += `<div class="card clickable" onclick="App.utils.openUrl('${p.url}')">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:28px">${p.emoji}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--text-primary)">${this.utils.escape(p.name)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${this.utils.escape(p.desc)}</div>
          </div>
        </div>
      </div>`;
    });
    html += '</div>';

    // Shanghai All-Dimensional News
    if (typeof SHANGHAI_NEWS !== 'undefined') {
      html += '<div class="section-title"><span class="emoji">馃彊锔?/span>涓婃捣鍏ㄧ淮搴?<button class="refresh-btn" onclick="App.refreshShanghaiNews()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:#E74C3C;cursor:pointer">馃攧 鍒锋柊</button></div>';
      html += '<div class="news-card" style="border-left:3px solid #E74C3C">';
      html += '<div class="news-tabs" style="flex-wrap:wrap">';
      SHANGHAI_CATEGORIES.forEach(c => {
        const active = this.state.shanghaiTab === c.key ? 'active' : '';
        html += `<div class="news-tab ${active}" style="${active ? `background:${c.color}` : ''}" onclick="App.switchShanghaiTab('${c.key}')">${c.emoji} ${c.label}</div>`;
      });
      html += '</div>';
      html += `<div id="shanghai-panel">${this.renderShanghaiPanel()}</div>`;
      html += '</div>';
      // Shanghai sources
      html += '<div style="margin-top:8px"><span style="font-size:11px;color:var(--text-muted)">涓婃捣淇℃伅婧愶細</span>';
      (SHANGHAI_NEWS.sources || []).forEach(s => {
        html += `<a href="${s.url}" target="_blank" style="font-size:11px;color:var(--primary-dark);margin-right:10px;text-decoration:none">${this.utils.escape(s.name)}</a>`;
      });
      html += '</div>';
    }

    // Sources
    html += '<div class="section-title"><span class="emoji">馃敆</span>鏂伴椈婧?/div>';
    html += '<div class="news-sources"><span class="news-sources-label">蹇锛?/span>';
    NEWS_POOL.sources.forEach(s => {
      html += `<a href="${s.url}" target="_blank" class="news-source-link">${this.utils.escape(s.name)}</a>`;
    });
    html += '</div>';

    el.innerHTML = html;
  },

  refreshKnowledge() {
    this.state.knowledgeShuffled = this.utils.shuffle(DAILY_KNOWLEDGE).slice(0, 4);
    this.state.data.knowledgeLastUpdate = this.utils.formatDateTime(new Date());
    this.store.save();
    this.render();
    this.utils.toast('宸叉洿鏂版瘡鏃ョ煡璇?);
  },

  /* ====== News ====== */
  switchNewsTab(cat) {
    this.state.newsActiveTab = cat;
    if (!this.state.newsData[cat] && (cat === 'politics' || cat === 'social')) {
      this.fetchNews(cat);
    }
    this.render();
  },

  async fetchNews(cat) {
    if (cat !== 'politics' && cat !== 'social') return;
    this.state.newsLoading[cat] = true;
    if (this.state.newsActiveTab === cat) this.updateNewsPanel();
    try {
      const url = cat === 'politics' ? 'https://api.vvhan.com/api/60s' : 'https://api.vvhan.com/api/hotlist/wbHot';
      const res = await fetch(url);
      const data = await res.json();
      let items = [];
      if (cat === 'politics' && data && data.data && Array.isArray(data.data)) {
        items = data.data.slice(0, 6).map((item, i) => {
          const text = typeof item === 'string' ? item : (item.title || item.name || '');
          return {
            title: text.length > 40 ? text.substring(0, 40) + '...' : text,
            summary: '姣忔棩60绉掕鎳備笘鐣?,
            source: 'vvhan',
            url: 'https://api.vvhan.com/',
            detail: text,
          };
        });
      } else if (cat === 'social' && data && data.data && Array.isArray(data.data)) {
        items = data.data.slice(0, 8).map(item => ({
          title: item.title || item.name || '',
          summary: item.hot ? `鐑害: ${item.hot}` : '寰崥鐑悳',
          source: '寰崥',
          url: item.url || item.mobil_url || 'https://s.weibo.com/top/summary',
          detail: item.title || item.name || '',
        }));
      }
      if (items.length > 0) {
        this.state.newsData[cat] = items;
        this.state.data.newsLastUpdate = this.utils.formatDateTime(new Date());
        this.store.save();
      }
    } catch (e) {
      // fallback to NEWS_POOL
    }
    this.state.newsLoading[cat] = false;
    if (this.state.newsActiveTab === cat) this.updateNewsPanel();
  },

  updateNewsPanel() {
    const panel = document.getElementById('news-panel');
    if (panel) panel.innerHTML = this.renderNewsPanel();
  },

  renderNewsPanel() {
    const cat = this.state.newsActiveTab;
    if (this.state.newsLoading[cat]) {
      return '<div class="empty-state"><div class="loading-dots" style="color:var(--primary)"><span></span><span></span><span></span></div><div style="font-size:12px;margin-top:8px">鍔犺浇涓?..</div></div>';
    }
    const items = this.state.newsData[cat] || NEWS_POOL[cat] || [];
    if (!items.length) return '<div class="empty-state"><div class="empty-state-icon">馃摥</div>鏆傛棤鏂伴椈</div>';
    let html = '';
    const poolItems = NEWS_POOL[cat] || [];
    items.forEach((item, idx) => {
      const sourceColor = cat === 'politics' ? MODULES[3].colorDark : (cat === 'social' ? '#FF6B6B' : 'var(--primary-dark)');
      html += `<div class="news-item" onclick="App.showNewsDetail('${cat}',${idx})">
        <div class="news-item-top">
          <span class="news-source" style="background:${sourceColor}22;color:${sourceColor}">${this.utils.escape(item.source || '鏂伴椈')}</span>
          <span class="news-hot">#${idx + 1}</span>
        </div>
        <div class="news-item-title">${this.utils.escape(item.title)}</div>
        <div class="news-item-summary">${this.utils.escape(item.summary || '')}</div>
      </div>`;
    });
    const updateTime = this.state.data.newsLastUpdate || '鏈洿鏂?;
    html += `<div class="news-refresh-info">鏈€鍚庢洿鏂帮細${this.utils.escape(updateTime)}</div>`;
    return html;
  },

  showNewsDetail(cat, idx) {
    const items = this.state.newsData[cat] || NEWS_POOL[cat] || [];
    const item = items[idx];
    if (!item) return;
    this.showDetail('news', JSON.stringify({ cat, idx }));
  },

  refreshNews() {
    this.state.newsData = {};
    this.fetchNews('politics');
    this.fetchNews('social');
    this.utils.toast('姝ｅ湪鍒锋柊鏂伴椈...');
  },

  /* ====== Shanghai All-Dimensional News ====== */
  switchShanghaiTab(cat) {
    this.state.shanghaiTab = cat;
    this.render();
  },

  renderShanghaiPanel() {
    const cat = this.state.shanghaiTab || 'hotspot';
    const items = SHANGHAI_NEWS[cat] || [];
    if (!items.length) return '<div class="empty-state"><div class="empty-state-icon">馃摥</div>鏆傛棤鍐呭</div>';
    const displayItems = items.length > 6 ? this.utils.shuffle(items).slice(0, 6) : items;
    let html = '';
    displayItems.forEach((item, idx) => {
      const catInfo = SHANGHAI_CATEGORIES.find(c => c.key === cat);
      const color = catInfo ? catInfo.color : '#E74C3C';
      html += `<div class="news-item" onclick="App.showShanghaiDetail('${cat}',${items.indexOf(item)})">
        <div class="news-item-top">
          <span class="news-source" style="background:${color}22;color:${color}">${this.utils.escape(item.source || catInfo.label)}</span>
          ${item.date ? `<span style="font-size:11px;color:var(--text-muted);margin-left:auto">${this.utils.escape(item.date)}</span>` : ''}
        </div>
        <div class="news-item-title">${this.utils.escape(item.title)}</div>
        <div class="news-item-summary">${this.utils.escape(item.summary || '')}</div>
      </div>`;
    });
    return html;
  },

  showShanghaiDetail(cat, idx) {
    const items = SHANGHAI_NEWS[cat] || [];
    const item = items[idx];
    if (!item) return;
    this.showDetail('shanghai', JSON.stringify({ cat, idx }));
  },

  refreshShanghaiNews() {
    this.render();
    this.utils.toast('涓婃捣鏂伴椈宸插埛鏂?);
  },

  /* ====== Employment View ====== */
  viewEmployment(el) {
    const m = MODULES[1];
    let html = `<div class="hero fade-in" style="background:linear-gradient(135deg,${m.color},${m.colorDark})">
      <div class="hero-deco"></div><div class="hero-deco2"></div>
      <div class="hero-title">馃捈 灏变笟鏀诲潥</div>
      <div class="hero-sub">绮惧噯甯壎姣忎竴浣嶅鐢?/div>
    </div>`;

    // Stats
    const stats = { unknown: 0, employed: 0, seeking: 0, postgrad: 0, civil: 0, startup: 0, unemployed: 0 };
    STUDENTS.forEach(raw => {
      const s = this.getStudent(raw.id);
      if (stats[s.status] !== undefined) stats[s.status]++;
    });
    const total = STUDENTS.length;
    const knownCount = total - stats.unknown;
    const empRate = total > 0 ? Math.round(((stats.employed + stats.postgrad + stats.startup) / total) * 100) : 0;

    html += '<div class="section-title"><span class="emoji">馃搳</span>灏变笟缁熻</div>';
    html += `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div><span style="font-size:28px;font-weight:700;color:${m.colorDark}">${empRate}%</span><span style="font-size:13px;color:var(--text-muted);margin-left:6px">灏变笟鐜?/span></div>
        <div style="font-size:13px;color:var(--text-muted)">鍏?${total} 浜?路 宸叉洿鏂?${knownCount} 浜?/div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${empRate}%;background:linear-gradient(90deg,${m.color},${m.colorDark})"></div></div>
    </div>`;

    html += '<div class="emp-stat-grid">';
    const statList = [
      { key: 'unknown', label: '鏈煡', emoji: '鉂? },
      { key: 'employed', label: '宸插氨涓?, emoji: '鉁? },
      { key: 'seeking', label: '姹傝亴涓?, emoji: '馃攳' },
      { key: 'postgrad', label: '鑰冪爺', emoji: '馃摎' },
      { key: 'civil', label: '鑰冨叕', emoji: '馃彌' },
      { key: 'startup', label: '鍒涗笟', emoji: '馃殌' },
      { key: 'unemployed', label: '鏈氨涓?, emoji: '鈿狅笍' },
    ];
    statList.forEach(s => {
      const sc = STATUS_MAP[s.key];
      html += `<div class="emp-stat-card">
        <div class="emp-stat-val" style="color:${sc ? sc.text : 'var(--text-primary)'}">${stats[s.key]}</div>
        <div class="emp-stat-label">${s.emoji} ${s.label}</div>
      </div>`;
    });
    html += '</div>';

    // Student Search & Filter
    html += '<div class="section-title"><span class="emoji">馃懃</span>瀛︾敓鏁版嵁</div>';
    html += `<input class="student-search" placeholder="鎼滅储濮撳悕/鍏徃/涓撲笟..." value="${this.utils.escape(this.state.studentSearch)}" oninput="App.onStudentSearch(this.value)">`;
    html += '<div class="student-filter">';
    html += `<div class="filter-chip ${this.state.studentFilter === 'all' ? 'active' : ''}" style="${this.state.studentFilter === 'all' ? `background:${m.colorDark}` : ''}" onclick="App.setStudentFilter('all')">鍏ㄩ儴 ${total}</div>`;
    statList.forEach(s => {
      const active = this.state.studentFilter === s.key;
      html += `<div class="filter-chip ${active ? 'active' : ''}" style="${active ? `background:${STATUS_MAP[s.key].colorDark || m.colorDark}` : ''}" onclick="App.setStudentFilter('${s.key}')">${s.label} ${stats[s.key]}</div>`;
    });
    html += '</div>';

    // Student List
    let filtered = STUDENTS.map(raw => this.getStudent(raw.id));
    if (this.state.studentFilter !== 'all') {
      filtered = filtered.filter(s => s.status === this.state.studentFilter);
    }
    const search = this.state.studentSearch.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(search) ||
        (s.company || '').toLowerCase().includes(search) ||
        (s.major || '').toLowerCase().includes(search) ||
        (s.cls || '').toLowerCase().includes(search)
      );
    }

    if (filtered.length === 0) {
      html += '<div class="empty-state"><div class="empty-state-icon">馃攳</div>娌℃湁鍖归厤鐨勫鐢?/div>';
    } else {
      const display = filtered.slice(0, 30);
      html += `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">鏄剧ず ${display.length}/${filtered.length} 鏉?/div>`;
      display.forEach(s => {
        const sc = STATUS_MAP[s.status] || { color: '#E8F4F8', text: '#6B7C8D', label: s.status };
        const avatarColors = ['#5BB5E8', '#7FD4A8', '#B89EE8', '#FFC088', '#FF9A92', '#FFD966', '#FFA8C8'];
        const avatarColor = avatarColors[s.name.charCodeAt(0) % avatarColors.length];
        html += `<div class="student-card" onclick="App.showDetail('student','${s.id}')">
          <div class="student-avatar" style="background:${avatarColor}">${this.utils.escape(s.name.charAt(0))}</div>
          <div class="student-info">
            <div class="student-name">${this.utils.escape(s.name)} <span style="font-size:12px;color:var(--text-muted);font-weight:400">${s.gender === '濂? ? '鈾€' : '鈾?}</span></div>
            <div class="student-meta">${this.utils.escape(s.major)} 路 ${this.utils.escape(s.cls)}</div>
            ${s.company ? `<div class="student-meta">${this.utils.escape(s.company)} ${s.position ? '路 ' + this.utils.escape(s.position) : ''}</div>` : ''}
          </div>
          <div class="student-status" style="background:${sc.color};color:${sc.text}">${sc.label}</div>
        </div>`;
      });
      if (filtered.length > 30) {
        html += `<div style="text-align:center;padding:10px"><button class="btn btn-soft" onclick="App.showAllStudents()">鏌ョ湅鍏ㄩ儴 ${filtered.length} 浜?/button></div>`;
      }
    }

    // Job Recommendations
    html += '<div class="section-title"><span class="emoji">馃幆</span>宀椾綅鎺ㄨ崘 <button class="refresh-btn" onclick="App.refreshJobs()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:var(--primary-dark);cursor:pointer">馃攧 鍒锋柊</button></div>';
    const jobList = this.getJobList();
    html += '<div class="grid grid-2">';
    jobList.forEach(j => {
      html += `<div class="card clickable" onclick="App.showDetail('job','${j.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:15px;font-weight:700;color:var(--text-primary)">${this.utils.escape(j.company)}</div>
          <span class="badge" style="background:#FFE0E0;color:#E74C3C">${this.utils.escape(j.salary)}</span>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px">${this.utils.escape(j.position)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">馃搷 ${this.utils.escape(j.location)}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${j.tags.map(t => `<span class="tag">${this.utils.escape(t)}</span>`).join('')}</div>
      </div>`;
    });
    html += '</div>';

    // Resume Modification
    html += '<div class="section-title"><span class="emoji">馃摑</span>绠€鍘嗕慨鏀?/div>';
    html += `<div class="card clickable" onclick="App.openResumeForm()">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="stat-icon" style="background:${m.color}22">馃摑</div>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:600;color:var(--text-primary)">绠€鍘嗘櫤鑳戒慨鏀?/div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">涓婁紶绠€鍘嗭紝鑾峰彇閽堝鎬т慨鏀瑰缓璁?/div>
        </div>
        <span style="font-size:20px;color:var(--text-muted)">鈥?/span>
      </div>
    </div>`;
    if (this.state.data.resumes && this.state.data.resumes.length > 0) {
      html += `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">宸蹭繚瀛?${this.state.data.resumes.length} 浠界畝鍘嗚褰?/div>`;
    }

    // Policies - dynamic pool with refresh
    const policyPool = typeof POLICIES_POOL !== 'undefined' ? POLICIES_POOL : POLICIES;
    if (!this.state.policyIdx) this.state.policyIdx = 0;
    const policyStart = this.state.policyIdx % policyPool.length;
    const displayPolicies = [...policyPool.slice(policyStart), ...policyPool.slice(0, policyStart)].slice(0, 6);
    html += '<div class="section-title"><span class="emoji">馃搵</span>灏变笟鏀跨瓥 <button class="refresh-btn" onclick="App.refreshPolicies()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:var(--primary-dark);cursor:pointer">馃攧 鍒锋柊</button></div>';
    html += '<div class="grid grid-2">';
    displayPolicies.forEach(p => {
      html += `<div class="card clickable" onclick="App.showDetail('policy','${p.id}')">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <span class="badge" style="background:${m.color}22;color:${m.colorDark}">${this.utils.escape(p.tag)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${this.utils.escape(p.date)}</span>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px">${this.utils.escape(p.title)}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5">${this.utils.escape(p.summary)}</div>
      </div>`;
    });
    html += '</div>';

    // Resources
    html += this.renderResources('employment');

    el.innerHTML = html;
  },

  onStudentSearch(val) {
    this.state.studentSearch = val;
    this.render();
    const input = document.querySelector('.student-search');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  },

  setStudentFilter(f) {
    this.state.studentFilter = f;
    this.render();
  },

  showAllStudents() {
    this.setSubView('allStudents');
  },

  getJobList() {
    const idx = this.state.data.jobIdx || 0;
    const start = idx % JOB_RECS.length;
    return [...JOB_RECS.slice(start), ...JOB_RECS.slice(0, start)];
  },

  refreshJobs() {
    this.state.data.jobIdx = (this.state.data.jobIdx || 0) + 3;
    this.store.save();
    this.render();
    this.utils.toast('宀椾綅鎺ㄨ崘宸插埛鏂?);
  },

  refreshPolicies() {
    this.state.policyIdx = (this.state.policyIdx || 0) + Math.floor(Math.random() * 3 + 2);
    this.render();
    this.utils.toast('灏变笟鏀跨瓥宸叉洿鏂?);
  },

  refreshAbilityFramework() {
    this.state.frameworkExampleIdx = (this.state.frameworkExampleIdx || 0) + 1;
    this.render();
    this.utils.toast('鑳藉姏妗嗘灦妗堜緥宸插埛鏂?);
  },

  /* ====== Career View ====== */
  viewCareer(el) {
    const m = MODULES[2];
    let html = `<div class="hero fade-in" style="background:linear-gradient(135deg,${m.color},${m.colorDark})">
      <div class="hero-deco"></div><div class="hero-deco2"></div>
      <div class="hero-title">馃搱 鑱屼笟鎴愰暱</div>
      <div class="hero-sub">鎸佺画绮捐繘锛岃祴鑳芥垚闀?/div>
    </div>`;

    // AI Meeting Brief Generator
    html += '<div class="section-title"><span class="emoji">馃</span>AI浼氳绠€璁敓鎴?/div>';
    html += `<div class="card clickable" onclick="App.openMeetingForm()">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="stat-icon" style="background:${m.color}22">馃</div>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:600;color:var(--text-primary)">AI鏅鸿兘浼氳绠€璁?/div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">涓婁紶浼氳鏉愭枡锛孉I鑷姩鐢熸垚瀹屾暣浼氳绠€璁紙姒傝堪/璁/鍐宠/璁″垝锛?/div>
        </div>
        <span style="font-size:20px;color:var(--text-muted)">鈥?/span>
      </div>
    </div>`;
    if (this.state.data.meetings && this.state.data.meetings.length > 0) {
      html += `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">宸蹭繚瀛?${this.state.data.meetings.length} 浠戒細璁畝璁?路 <a href="javascript:App.setSubView('meetings')" style="color:${m.colorDark};font-weight:600">鏌ョ湅鍏ㄩ儴</a></div>`;
    }

    // Jianqiao Links
    html += '<div class="section-title"><span class="emoji">馃彨</span>寤烘ˉ瀛﹂櫌閾炬帴</div>';
    html += '<div class="grid grid-2">';
    JIANQIAO_LINKS.forEach(l => {
      html += `<div class="card clickable" onclick="App.utils.openUrl('${l.url}')">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:28px">${l.emoji}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--text-primary)">${this.utils.escape(l.name)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${this.utils.escape(l.desc)}</div>
          </div>
        </div>
      </div>`;
    });
    html += '</div>';

    // Ability Framework
    html += '<div class="section-title"><span class="emoji">馃</span>鑳藉姏鎻愬崌妗嗘灦 <span class="badge" style="background:#FFF3E0;color:#E65100;font-size:11px;margin-left:8px">Z涓栦唬妗堜緥</span> <button class="refresh-btn" onclick="App.refreshAbilityFramework()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:var(--primary-dark);cursor:pointer">馃攧 鍒锋柊妗堜緥</button></div>';
    html += '<div class="grid grid-2">';
    ABILITY_FRAMEWORK.forEach((a, i) => {
      const exampleShort = a.zExample ? a.zExample.substring(0, 65) + '鈥? : '';
      html += `<div class="card clickable" onclick="App.showDetail('ability',${i})" style="cursor:pointer">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:28px">${a.emoji}</span>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary)">${this.utils.escape(a.name)}</div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:8px">${this.utils.escape(a.desc)}</div>
        <div style="border-left:3px solid #E65100;padding:6px 8px;background:#FFF8E1;border-radius:0 6px 6px 0;font-size:11px;color:#7B5B00;line-height:1.5">
          <strong>馃摉 椴滄椿妗堜緥锛?/strong>${this.utils.escape(exampleShort)}
          <span style="color:#1976D2;font-weight:600;display:block;margin-top:3px;font-size:10px">鐐瑰嚮鏌ョ湅瀹屾暣妗堜緥 鈫?/span>
        </div>
      </div>`;
    });
    html += '</div>';

    // Daily Ability Tip
    html += '<div class="section-title"><span class="emoji">馃挕</span>姣忔棩鑳藉姏缁冧範 <button class="refresh-btn" onclick="App.refreshAbilityTip()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:var(--primary-dark);cursor:pointer">馃攧 鎹竴涓?/button></div>';
    const tip = this.getAbilityTip();
    html += `<div class="card" style="border-left:4px solid ${m.colorDark}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:28px">${tip.emoji}</span>
        <div>
          <span class="badge" style="background:${m.color}22;color:${m.colorDark}">${this.utils.escape(tip.cat)}</span>
        </div>
      </div>
      <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:8px;line-height:1.5">${this.utils.escape(tip.tip)}</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;background:var(--bg-soft);padding:10px;border-radius:8px">
        <strong>馃摑 浠婃棩缁冧範锛?/strong>${this.utils.escape(tip.practice)}
      </div>
    </div>`;

    // Career Policies (inline, first 3)
    html += '<div class="section-title"><span class="emoji">馃搵</span>鐩稿叧鏀跨瓥</div>';
    html += '<div class="grid grid-2">';
    POLICIES.slice(0, 3).forEach(p => {
      html += `<div class="card clickable" onclick="App.showPolicyModal('${p.id}')">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <span class="badge" style="background:${m.color}22;color:${m.colorDark}">${this.utils.escape(p.tag)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${this.utils.escape(p.date)}</span>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--text-primary)">${this.utils.escape(p.title)}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">${this.utils.escape(p.summary)}</div>
      </div>`;
    });
    html += '</div>';

    // Resources
    html += this.renderResources('career');

    el.innerHTML = html;
  },

  showPolicyModal(id) {
    const p = POLICIES.find(x => x.id === id);
    if (!p) return;
    this.showModal(`<div class="modal-header">
      <div class="modal-title">${this.utils.escape(p.title)}</div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div class="detail-meta">
      <span class="detail-badge" style="background:var(--primary-light);color:var(--primary-dark)">${this.utils.escape(p.tag)}</span>
      <span class="tag">${this.utils.escape(p.date)}</span>
    </div>
    <div class="detail-body">${this.utils.nl2br(p.detail)}</div>`);
  },

  /* ====== Research View ====== */
  viewResearch(el) {
    const m = MODULES[3];
    let html = `<div class="hero fade-in" style="background:linear-gradient(135deg,${m.color},${m.colorDark})">
      <div class="hero-deco"></div><div class="hero-deco2"></div>
      <div class="hero-title">馃摎 绉戠爺鑳藉姏</div>
      <div class="hero-sub">浠ョ爺淇冩暀锛屾暀鐮旂浉闀?/div>
    </div>`;

    // Papers
    html += '<div class="section-title"><span class="emoji">馃搫</span>璁烘枃鍙傝€?<button class="refresh-btn" onclick="App.refreshPapers()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:var(--primary-dark);cursor:pointer">馃攧 鍒锋柊</button></div>';
    const paperList = this.getPaperList();
    html += '<div class="grid grid-2">';
    paperList.forEach(p => {
      html += `<div class="card clickable" onclick="App.showDetail('paper','${p.id}')">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <span class="badge" style="background:${m.color}22;color:${m.colorDark}">${this.utils.escape(p.tag)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${this.utils.escape(p.date)}</span>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px;line-height:1.4">${this.utils.escape(p.title)}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5">${this.utils.escape(p.summary)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px">馃摉 ${this.utils.escape(p.journal)}</div>
      </div>`;
    });
    html += '</div>';

    // Topics
    html += '<div class="section-title"><span class="emoji">馃敩</span>閫夐鏂瑰悜 <button class="refresh-btn" onclick="App.refreshTopics()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:var(--primary-dark);cursor:pointer">馃攧 鍒锋柊</button></div>';
    const topicList = this.getTopicList();
    html += '<div class="grid grid-2">';
    topicList.forEach(t => {
      html += `<div class="card clickable" onclick="App.showTopicModal('${t.id}')">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <span class="badge" style="background:${m.color}22;color:${m.colorDark}">${this.utils.escape(t.level)}</span>
          <span class="tag">${this.utils.escape(t.type)}</span>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px">${this.utils.escape(t.title)}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5">${this.utils.escape(t.desc)}</div>
      </div>`;
    });
    html += '</div>';

    // Notes
    html += this.renderNotes('research');

    // Resources
    html += this.renderResources('research');

    el.innerHTML = html;
  },

  showTopicModal(id) {
    const t = TOPICS_POOL.find(x => x.id === id) || TOPICS.find(x => x.id === id);
    if (!t) return;
    this.showModal(`<div class="modal-header">
      <div class="modal-title">${this.utils.escape(t.title)}</div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div class="detail-meta">
      <span class="badge" style="background:var(--primary-light);color:var(--primary-dark)">${this.utils.escape(t.level)}</span>
      <span class="tag">${this.utils.escape(t.type)}</span>
    </div>
    <div class="detail-body"><p>${this.utils.escape(t.desc)}</p>
    <p style="margin-top:12px;font-size:13px;color:var(--text-muted)">馃挕 閫夐寤鸿锛氱粨鍚堝缓妗ュ闄㈠疄闄呭拰涓撳崌鏈鐢熺壒鐐癸紝鍙粠姝ゆ柟鍚戞繁鍖栫爺绌躲€傜偣鍑?鍒锋柊"鍙幏鍙栨洿澶氶€夐鐏垫劅銆?/p></div>`);
  },

  getPaperList() {
    const idx = this.state.data.paperIdx || 0;
    const pool = PAPERS_POOL.length ? PAPERS_POOL : PAPERS;
    const start = idx % pool.length;
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];
    return rotated.slice(0, 6);
  },

  refreshPapers() {
    this.state.data.paperIdx = (this.state.data.paperIdx || 0) + 3;
    this.store.save();
    this.render();
    this.utils.toast('璁烘枃鍙傝€冨凡鍒锋柊');
  },

  getTopicList() {
    const idx = this.state.data.topicIdx || 0;
    const pool = TOPICS_POOL.length ? TOPICS_POOL : TOPICS;
    const start = idx % pool.length;
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];
    return rotated.slice(0, 6);
  },

  refreshTopics() {
    this.state.data.topicIdx = (this.state.data.topicIdx || 0) + 3;
    this.store.save();
    this.render();
    this.utils.toast('閫夐鏂瑰悜宸插埛鏂?);
  },

  getBookList() {
    const idx = this.state.data.bookIdx || 0;
    const pool = BOOKS_POOL.length ? BOOKS_POOL : BOOKS;
    const start = idx % pool.length;
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];
    return rotated.slice(0, 8);
  },

  refreshBooks() {
    this.state.data.bookIdx = (this.state.data.bookIdx || 0) + 4;
    this.store.save();
    this.render();
    this.utils.toast('涔︽灦宸插埛鏂?);
  },

  getAbilityTip() {
    const idx = this.state.data.abilityTipIdx || 0;
    return DAILY_ABILITY_TIPS[idx % DAILY_ABILITY_TIPS.length];
  },

  refreshAbilityTip() {
    this.state.data.abilityTipIdx = (this.state.data.abilityTipIdx || 0) + 1;
    this.store.save();
    this.render();
    this.utils.toast('宸叉崲涓€涓粌涔?);
  },

  /* ====== Exam View ====== */
  viewExam(el) {
    const m = MODULES[4];
    let html = `<div class="hero fade-in" style="background:linear-gradient(135deg,${m.color},${m.colorDark})">
      <div class="hero-deco"></div><div class="hero-deco2"></div>
      <div class="hero-title">鉁忥笍 鍏€冨鑰?/div>
      <div class="hero-sub">鏃ョН鏈堢疮锛屾按鍒版笭鎴?/div>
    </div>`;

    // Daily Questions - using expanded pool
    const examPool = typeof EXAM_POOL !== 'undefined' ? EXAM_POOL : EXAM_QUESTIONS;
    if (!this.state.examDailyIdx) this.state.examDailyIdx = 0;
    const qStart = this.state.examDailyIdx % examPool.length;
    const dailyQuestions = [...examPool.slice(qStart), ...examPool.slice(0, qStart)].slice(0, 6);
    html += `<div class="section-title"><span class="emoji">馃摑</span>姣忔棩涓€棰?<button class="refresh-btn" onclick="App.refreshExamDaily()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:${m.colorDark};cursor:pointer">馃攧 鎹竴鎵癸紙鍏?{examPool.length}棰橈級</button></div>`;
    html += '<div class="grid grid-2">';
    dailyQuestions.forEach(q => {
      html += `<div class="card clickable" onclick="App.showDetail('question','${q.id}')">
        <span class="badge" style="background:${m.color}22;color:${m.colorDark};margin-bottom:6px">${this.utils.escape(q.tag)}</span>
        <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-top:4px;line-height:1.4">${this.utils.escape(q.q)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">鐐瑰嚮鏌ョ湅绛旀 鈫?/div>
      </div>`;
    });
    html += '</div>';

    // Quiz Mode - dynamic generation
    html += '<div class="section-title"><span class="emoji">馃幃</span>鍒烽妯″紡</div>';
    const qp = this.state.data.quizProgress;
    const totalQ = examPool.length;
    html += `<div class="card clickable" onclick="App.openQuiz()">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="stat-icon" style="background:${m.color}22">馃幃</div>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:600;color:var(--text-primary)">琛屾祴鍒烽鎸戞垬</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">棰樺簱鍏?${totalQ} 棰?路 宸茬瓟 ${qp.answered} 棰?路 姝ｇ‘ ${qp.correct} 棰?/div>
        </div>
        <span style="font-size:20px;color:var(--text-muted)">鈥?/span>
      </div>
      ${qp.answered > 0 ? `<div class="progress-bar" style="margin-top:10px"><div class="progress-fill" style="width:${Math.min(Math.round(qp.answered / totalQ * 100), 100)}%;background:${m.colorDark}"></div></div>` : ''}
    </div>`;
    // Quick quiz groups by category
    html += '<div style="margin-top:10px"><span style="font-size:12px;color:var(--text-muted);font-weight:600">鍒烽缁勶細</span></div>';
    html += '<div class="grid grid-2">';
    const quizGroups = [
      { label:'鏃舵斂缁?, key:'鏃舵斂', emoji:'馃摪' },
      { label:'琛屾祴缁?, key:'琛屾祴', emoji:'馃搳' },
      { label:'鐢宠缁?, key:'鐢宠', emoji:'鉁嶏笍' },
      { label:'杈呭鍛樺矖', key:'杈呭鍛樺矖', emoji:'馃彨' },
      { label:'缁煎悎缁?, key:'all', emoji:'馃幆' },
    ];
    quizGroups.forEach(g => {
      const count = g.key === 'all' ? examPool.length : examPool.filter(q => q.tag === g.key).length;
      html += `<div class="card clickable" onclick="App.openQuizGroup('${g.key}')" style="text-align:center;padding:12px">
        <div style="font-size:24px;margin-bottom:4px">${g.emoji}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${g.label}</div>
        <div style="font-size:11px;color:var(--text-muted)">${count} 棰?/div>
      </div>`;
    });
    html += '</div>';

    // Study Plan
    html += '<div class="section-title"><span class="emoji">馃搮</span>姣忔棩瀛︿範璁″垝</div>';
    const studyPlan = [
      { time: '06:30-07:00', task: '鏅ㄨ锛氭椂鏀跨儹鐐广€佺敵璁虹礌鏉?, emoji: '馃寘' },
      { time: '08:00-09:30', task: '琛屾祴锛氳█璇悊瑙?+ 鍒ゆ柇鎺ㄧ悊', emoji: '馃摉' },
      { time: '10:00-11:30', task: '琛屾祴锛氭暟閲忓叧绯?+ 璧勬枡鍒嗘瀽', emoji: '鉁忥笍' },
      { time: '14:00-15:30', task: '鐢宠锛氳寖鏂囩簿璇?+ 绱犳潗绉疮', emoji: '馃摑' },
      { time: '16:00-17:00', task: '鍒烽锛氶敊棰樺洖椤?+ 涓撻」缁冧範', emoji: '馃攧' },
      { time: '20:00-21:00', task: '澶嶇洏锛氫粖鏃ユ€荤粨 + 鏄庢棩璁″垝', emoji: '馃寵' },
    ];
    html += '<div class="card">';
    studyPlan.forEach(s => {
      html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-soft)">
        <span style="font-size:20px">${s.emoji}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--primary-dark)">${s.time}</div>
          <div style="font-size:13px;color:var(--text-secondary)">${this.utils.escape(s.task)}</div>
        </div>
      </div>`;
    });
    html += '</div>';

    // Notes
    html += this.renderNotes('exam');

    // Resources
    html += this.renderResources('exam');

    el.innerHTML = html;
  },

  refreshExamDaily() {
    const pool = typeof EXAM_POOL !== 'undefined' ? EXAM_POOL : EXAM_QUESTIONS;
    this.state.examDailyIdx = (this.state.examDailyIdx || 0) + Math.floor(Math.random() * 3 + 3);
    this.render();
    this.utils.toast(`宸插埛鏂?路 棰樺簱鍏?{pool.length}棰榒);
  },

  /* ====== Life View ====== */
  viewLife(el) {
    const m = MODULES[5];
    let html = `<div class="hero fade-in" style="background:linear-gradient(135deg,${m.color},${m.colorDark})">
      <div class="hero-deco"></div><div class="hero-deco2"></div>
      <div class="hero-title">馃尭 鐢熸椿鐖卞ソ</div>
      <div class="hero-sub">宸ヤ綔涔嬪锛屼篃瑕佺儹鐖辩敓娲?/div>
    </div>`;

    // Book Categories
    html += '<div class="section-title"><span class="emoji">馃敄</span>涔︾睄鍒嗙被鎺ㄨ崘</div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
    BOOK_CATEGORIES.forEach(c => {
      html += `<a href="${c.url}" target="_blank" class="filter-chip" style="text-decoration:none;background:${m.color}22;color:${m.colorDark};border-color:${m.color}33">${this.utils.escape(c.name)}</a>`;
    });
    html += '</div>';

    // Books
    html += '<div class="section-title"><span class="emoji">馃摎</span>鎴戠殑涔︽灦 <button class="refresh-btn" onclick="App.refreshBooks()" style="float:right;font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);color:var(--primary-dark);cursor:pointer">馃攧 鍒锋柊</button></div>';
    const bookList = this.getBookList();
    bookList.forEach(b => {
      html += `<div class="book-card" onclick="App.showDetail('book','${b.id}')">
        <div class="book-cover" style="background:${b.color}22">${b.emoji}</div>
        <div class="book-info">
          <div class="book-title">${this.utils.escape(b.title)}</div>
          <div class="book-author">${this.utils.escape(b.author)} 路 ${this.utils.escape(b.tag)}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">${this.utils.escape(b.summary)}</div>
          <div class="book-links">
            <a href="${b.links.weread}" target="_blank" class="book-link" style="background:${b.color}22;color:${b.colorDark}" onclick="event.stopPropagation()">寰俊璇讳功</a>
            <a href="${b.links.douban}" target="_blank" class="book-link" style="background:#FFF3CC;color:#B8860B" onclick="event.stopPropagation()">璞嗙摚</a>
            <span class="tag" style="margin-left:auto">${this.utils.escape(b.status)}</span>
          </div>
        </div>
      </div>`;
    });

    // Hobbies
    html += '<div class="section-title"><span class="emoji">馃帹</span>鍏磋叮鐖卞ソ</div>';
    html += '<div class="grid grid-2">';
    HOBBIES.forEach(h => {
      html += `<div class="card clickable" onclick="App.showDetail('hobby','${h.id}')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:28px">${h.emoji}</span>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary)">${this.utils.escape(h.name)}</div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5">${this.utils.escape(h.summary)}</div>
      </div>`;
    });
    html += '</div>';

    // Notes
    html += this.renderNotes('life');

    // Resources
    html += this.renderResources('life');

    el.innerHTML = html;
  },

  /* ====== Family View ====== */
  viewFamily(el) {
    const m = MODULES[6];
    const gs = this.state.data.gameState;
    const todayChallenge = this.utils.getDaily(CHALLENGES);
    const todayDone = gs.challengeDone && gs.challengeDone.includes(todayChallenge.id);

    let html = `<div class="game-header fade-in" style="background:linear-gradient(135deg,${m.color},${m.colorDark})">
      <div class="game-header-deco"></div>
      <div style="font-size:18px;font-weight:700;position:relative;z-index:1">馃挄 娆箰鏃跺厜</div>
      <div class="game-stats">
        <div><div class="game-stat-val">${gs.totalHearts || 0} 鉂わ笍</div><div class="game-stat-label">鐖卞績鎬绘暟</div></div>
        <div><div class="game-stat-val">${gs.streak || 0} 馃敟</div><div class="game-stat-label">杩炵画澶╂暟</div></div>
        <div><div class="game-stat-val">${gs.bucketListDone ? gs.bucketListDone.length : 0}/${GAMES_DATA.bucketList.length}</div><div class="game-stat-label">蹇冩効鍗?/div></div>
      </div>
    </div>`;

    // Daily Challenge
    html += '<div class="section-title"><span class="emoji">馃幆</span>浠婃棩鎸戞垬</div>';
    if (todayChallenge) {
      const photos = gs.challengePhotos && gs.challengePhotos[todayChallenge.id] || [];
      html += `<div class="card" style="border:2px solid ${todayChallenge.color}44">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <span style="font-size:36px">${todayChallenge.emoji}</span>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700;color:var(--text-primary)">${this.utils.escape(todayChallenge.name)}</div>
            <div style="font-size:12px;color:var(--text-muted)">浠婃棩鎸戞垬 路 ${todayDone ? '宸插畬鎴?鉁? : '寰呭畬鎴?} 路 ${photos.length > 0 ? photos.length + '寮犳墦鍗＄収' : '鏈墦鍗?}</div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">${this.utils.escape(todayChallenge.desc)}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-soft" style="flex:1" onclick="App.showChallengeDetail('${todayChallenge.id}')">馃搵 鏌ョ湅瑙勫垯</button>
          ${todayDone ? '<div class="badge" style="background:#D4F0DE;color:#2E7D32;display:flex;align-items:center">宸插畬鎴?鉁?/div>' : `<button class="btn btn-primary" style="flex:1" onclick="App.showChallengeDetail('${todayChallenge.id}')">寮€濮嬫寫鎴?鈫?/button>`}
        </div>
      </div>`;
    }

    // All Challenges
    html += '<div style="font-size:13px;color:var(--text-muted);margin-top:8px">鍏ㄩ儴鎸戞垬锛?/div>';
    html += '<div class="grid grid-2" style="margin-top:8px">';
    CHALLENGES.forEach(c => {
      const done = gs.challengeDone && gs.challengeDone.includes(c.id);
      html += `<div class="card ${done ? '' : 'clickable'}" style="${done ? 'opacity:0.6' : ''}" onclick="${done ? '' : `App.showChallengeDetail('${c.id}')`}">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">${c.emoji}</span>
          <span style="font-size:13px;font-weight:600;flex:1;color:var(--text-primary)">${this.utils.escape(c.name)}</span>
          ${done ? '<span style="font-size:16px">鉁?/span>' : ''}
        </div>
      </div>`;
    });
    html += '</div>';

    // Couple Games
    html += '<div class="section-title"><span class="emoji">馃幃</span>鎯呬荆灏忔父鎴?/div>';
    const games = [
      { id: 'gacha', name: '鎵泲鏈?, desc: '闅忔満鎶藉彇浠婃棩娲诲姩', emoji: '馃幇' },
      { id: 'quiz', name: '榛樺闂瓟', desc: '浣犳湁澶氫簡瑙ｅ鏂癸紵', emoji: '鉂? },
      { id: 'memory', name: '璁板繂閰嶅', desc: '鎵惧埌鎵€鏈夐厤瀵?, emoji: '馃儚' },
      { id: 'truthdare', name: '鐪熷績璇濆ぇ鍐掗櫓', desc: '鍒烘縺鍙堢敎铚?, emoji: '馃拫' },
      { id: 'sweet', name: '鐢滆湝杞洏', desc: '浠婂ぉ鍚摢鍙ユ儏璇?, emoji: '馃帯' },
      { id: 'bucket', name: '蹇冩効娓呭崟', desc: '涓€璧峰畬鎴?0浠朵簨', emoji: '馃搵' },
    ];
    html += '<div class="grid grid-2">';
    games.forEach(g => {
      html += `<div class="card game-card-item" onclick="App.openGame('${g.id}')">
        <div class="game-card-icon" style="background:${m.color}22">${g.emoji}</div>
        <div class="game-card-name">${g.name}</div>
        <div class="game-card-desc">${g.desc}</div>
      </div>`;
    });
    html += '</div>';

    // Cat Care
    html += '<div class="section-title"><span class="emoji">馃惐</span>鐚挭鍏绘姢</div>';
    html += '<div class="grid grid-2">';
    CAT_CARE.forEach(c => {
      html += `<div class="card clickable" onclick="App.showDetail('cat','${c.id}')">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:24px">${c.emoji}</span>
          <div style="font-size:14px;font-weight:600;color:var(--text-primary)">${this.utils.escape(c.title)}</div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5">${this.utils.escape(c.summary)}</div>
      </div>`;
    });
    html += '</div>';

    // Relationship Tips
    html += '<div class="section-title"><span class="emoji">馃拺</span>鎯呮劅缁忚惀</div>';
    html += '<div class="grid grid-2">';
    RELATIONSHIP.forEach((r, i) => {
      html += `<div class="card clickable" onclick="App.showDetail('relationship',${i})">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:24px">${r.emoji}</span>
          <div style="font-size:14px;font-weight:600;color:var(--text-primary)">${this.utils.escape(r.title)}</div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5">${this.utils.escape(r.summary)}</div>
      </div>`;
    });
    html += '</div>';

    // Resources
    html += this.renderResources('family');

    el.innerHTML = html;
  },

  showChallengeDetail(id) {
    const c = CHALLENGES.find(x => x.id === id);
    if (!c) return;
    const gs = this.state.data.gameState;
    const done = gs.challengeDone && gs.challengeDone.includes(id);
    const photos = (gs.challengePhotos && gs.challengePhotos[id]) || [];

    let body = '';

    // Rules
    body += `<div style="background:var(--bg-soft);padding:12px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:14px;font-weight:700;color:var(--primary-dark);margin-bottom:6px">馃搵 娓告垙瑙勫垯</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;white-space:pre-line">${this.utils.escape(c.rules)}</div>
    </div>`;

    // Tasks
    if (c.tasks && c.tasks.length > 0) {
      body += '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px">鉁?浠诲姟娓呭崟</div>';
      c.tasks.forEach((task, i) => {
        body += `<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-soft)">
          <span style="font-size:16px;color:var(--primary);font-weight:700;min-width:20px">${i + 1}.</span>
          <span style="font-size:13px;color:var(--text-secondary);line-height:1.5;flex:1">${this.utils.escape(task)}</span>
        </div>`;
      });
      body += '<div style="height:12px"></div>';
    }

    // Question Bank (for榛樺鑰冮獙)
    if (c.questionBank && c.questionBank.length > 0) {
      body += '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px">鉂?棰樼洰搴擄紙閫?0棰橈級</div>';
      c.questionBank.forEach((q, i) => {
        body += `<div style="padding:8px;background:#fff;border:1px solid var(--border);border-radius:6px;margin-bottom:6px">
          <span style="font-size:13px;color:var(--text-primary)">Q${i + 1}. ${this.utils.escape(q)}</span>
        </div>`;
      });
      body += '<div style="height:12px"></div>';
    }

    // Suggestions
    if (c.suggestions && c.suggestions.length > 0) {
      body += '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px">馃挕 鎺ㄨ崘閫夐」</div>';
      body += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
      c.suggestions.forEach(s => {
        body += `<span class="tag" style="background:${c.color}22;color:${c.color};font-size:12px;padding:4px 10px;border-radius:12px">${this.utils.escape(s)}</span>`;
      });
      body += '</div>';
    }

    // Prompts (for鎯呬功)
    if (c.prompts && c.prompts.length > 0) {
      body += '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px">馃拰 鍐欎綔鐏垫劅</div>';
      c.prompts.forEach(p => {
        body += `<div style="padding:8px;background:var(--bg-soft);border-radius:6px;margin-bottom:6px;font-size:13px;color:var(--text-secondary)">鈥?${this.utils.escape(p)}</div>`;
      });
      body += '<div style="height:12px"></div>';
    }

    // Scoring
    if (c.scoring) {
      body += `<div style="background:#FFF8E8;padding:10px;border-radius:8px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:#B8860B">馃弳 璇勫垎鏍囧噯</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">${this.utils.escape(c.scoring)}</div>
      </div>`;
    }

    // Tips
    if (c.tips) {
      body += `<div style="background:#E8F4FC;padding:10px;border-radius:8px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--primary-dark)">馃挕 灏忚创澹?/div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">${this.utils.escape(c.tips)}</div>
      </div>`;
    }

    // Photo Check-in
    if (c.photoCheck) {
      body += '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px">馃摳 鎷嶇収鎵撳崱</div>';
      if (photos.length > 0) {
        body += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
        photos.forEach((src, i) => {
          body += `<div style="position:relative;width:70px;height:70px;border-radius:8px;overflow:hidden">
            <img src="${src}" style="width:100%;height:100%;object-fit:cover">
            <button onclick="App.removeChallengePhoto('${id}',${i})" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;font-size:12px;cursor:pointer;line-height:1">脳</button>
          </div>`;
        });
        body += '</div>';
      }
      if (c.photoItems) {
        body += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">寤鸿鎵撳崱锛? + c.photoItems.map(p => this.utils.escape(p)).join('銆?) + '</div>';
      }
      body += `<div style="display:flex;gap:8px">
        <label style="flex:1;cursor:pointer">
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="App.uploadChallengePhoto('${id}',this)">
          <div class="btn btn-soft" style="text-align:center">馃摲 鎷嶇収/涓婁紶</div>
        </label>
      </div>`;
    }

    // Complete button
    body += '<div style="height:16px"></div>';
    if (done) {
      body += '<div class="badge" style="background:#D4F0DE;color:#2E7D32;display:inline-flex;align-items:center;gap:4px;padding:8px 16px">鉁?宸插畬鎴?/div>';
    } else {
      body += `<button class="btn btn-primary btn-block" onclick="App.completeChallenge('${id}');App.closeModal()">瀹屾垚鎸戞垬 鉂わ笍 +1</button>`;
    }

    this.showModal(`<div class="modal-header">
      <div class="modal-title">${c.emoji} ${this.utils.escape(c.name)}</div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div style="padding:16px;max-height:70vh;overflow-y:auto">${body}</div>`);
  },

  uploadChallengePhoto(id, input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const gs = this.state.data.gameState;
      if (!gs.challengePhotos) gs.challengePhotos = {};
      if (!gs.challengePhotos[id]) gs.challengePhotos[id] = [];
      gs.challengePhotos[id].push(e.target.result);
      this.store.save();
      this.closeModal();
      this.showChallengeDetail(id);
      this.utils.toast('鎵撳崱鐓у凡淇濆瓨');
    };
    reader.readAsDataURL(file);
  },

  removeChallengePhoto(id, idx) {
    const gs = this.state.data.gameState;
    if (gs.challengePhotos && gs.challengePhotos[id]) {
      gs.challengePhotos[id].splice(idx, 1);
      if (gs.challengePhotos[id].length === 0) delete gs.challengePhotos[id];
      this.store.save();
      this.closeModal();
      this.showChallengeDetail(id);
      this.utils.toast('鐓х墖宸插垹闄?);
    }
  },

  completeChallenge(id) {
    const gs = this.state.data.gameState;
    if (!gs.challengeDone) gs.challengeDone = [];
    if (gs.challengeDone.includes(id)) {
      this.utils.toast('浠婃棩鎸戞垬宸插畬鎴愬暒');
      return;
    }
    gs.challengeDone.push(id);
    gs.totalHearts = (gs.totalHearts || 0) + 1;
    const today = this.utils.todayKey();
    if (gs.completedDates && gs.completedDates[today]) {
      // already done today
    } else {
      if (!gs.completedDates) gs.completedDates = {};
      gs.completedDates[today] = true;
      gs.streak = (gs.streak || 0) + 1;
    }
    this.store.save();
    this.render();
    this.utils.toast('鎸戞垬瀹屾垚锛?1 鉂わ笍');
  },

  /* ====== Games ====== */
  openGame(id) {
    this.setSubView('game_' + id);
  },

  renderSubView() {
    const sv = this.state.subView;
    if (sv === 'allStudents') {
      this.renderAllStudents();
    } else if (sv === 'meetings') {
      this.renderMeetingsList();
    } else if (sv === 'game_gacha') {
      this.renderGachaGame();
    } else if (sv === 'game_quiz') {
      this.renderCoupleQuizGame();
    } else if (sv === 'game_memory') {
      this.renderMemoryGame();
    } else if (sv === 'game_truthdare') {
      this.renderTruthDareGame();
    } else if (sv === 'game_sweet') {
      this.renderSweetWheelGame();
    } else if (sv === 'game_bucket') {
      this.renderBucketListGame();
    } else if (sv === 'quizMode') {
      this.renderQuizMode();
    } else {
      document.getElementById('content').innerHTML = '<div class="empty-state"><div class="empty-state-icon">馃攳</div>椤甸潰涓嶅瓨鍦?/div>';
    }
  },

  renderAllStudents() {
    const m = MODULES[1];
    this.renderTopbar({ title: '鍏ㄩ儴瀛︾敓' });
    let filtered = STUDENTS;
    if (this.state.studentFilter !== 'all') {
      filtered = filtered.filter(s => s.status === this.state.studentFilter);
    }
    const search = this.state.studentSearch.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(search) ||
        (s.company || '').toLowerCase().includes(search) ||
        (s.major || '').toLowerCase().includes(search)
      );
    }
    let html = `<input class="student-search" placeholder="鎼滅储..." value="${this.utils.escape(this.state.studentSearch)}" oninput="App.onStudentSearch(this.value)">`;
    html += '<div class="student-filter">';
    html += `<div class="filter-chip ${this.state.studentFilter === 'all' ? 'active' : ''}" style="${this.state.studentFilter === 'all' ? `background:${m.colorDark}` : ''}" onclick="App.setStudentFilter('all')">鍏ㄩ儴</div>`;
    Object.keys(STATUS_MAP).forEach(k => {
      const active = this.state.studentFilter === k;
      html += `<div class="filter-chip ${active ? 'active' : ''}" style="${active ? `background:${STATUS_MAP[k].colorDark || m.colorDark}` : ''}" onclick="App.setStudentFilter('${k}')">${STATUS_MAP[k].label}</div>`;
    });
    html += '</div>';
    filtered.forEach(s => {
      const sc = STATUS_MAP[s.status] || { color: '#E8F4F8', text: '#6B7C8D', label: s.status };
      const avatarColors = ['#5BB5E8', '#7FD4A8', '#B89EE8', '#FFC088', '#FF9A92', '#FFD966', '#FFA8C8'];
      const avatarColor = avatarColors[s.name.charCodeAt(0) % avatarColors.length];
      html += `<div class="student-card" onclick="App.showDetail('student','${s.id}')">
        <div class="student-avatar" style="background:${avatarColor}">${this.utils.escape(s.name.charAt(0))}</div>
        <div class="student-info">
          <div class="student-name">${this.utils.escape(s.name)}</div>
          <div class="student-meta">${this.utils.escape(s.major)} 路 ${this.utils.escape(s.cls)}</div>
          ${s.company ? `<div class="student-meta">${this.utils.escape(s.company)}</div>` : ''}
        </div>
        <div class="student-status" style="background:${sc.color};color:${sc.text}">${sc.label}</div>
      </div>`;
    });
    document.getElementById('content').innerHTML = html;
  },

  renderMeetingsList() {
    this.renderTopbar({ title: '浼氳绠€璁垪琛? });
    const meetings = this.state.data.meetings || [];
    let html = '<div class="section-title"><span class="emoji">馃</span>宸蹭繚瀛樼殑浼氳绠€璁?/div>';
    if (meetings.length === 0) {
      html += '<div class="empty-state"><div class="empty-state-icon">馃摥</div>鏆傛棤淇濆瓨鐨勪細璁畝璁?/div>';
    } else {
      html += '<div class="grid">';
      meetings.slice().reverse().forEach(mt => {
        const isBrief = mt.mode === 'ai-brief';
        html += `<div class="card clickable" onclick="App.viewMeeting('${mt.id}')">
          <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:4px">
            ${isBrief ? '馃 ' : '馃摑 '}${this.utils.escape(mt.title)}
          </div>
          <div style="font-size:12px;color:var(--text-muted)">${this.utils.escape(mt.date)} 路 ${this.utils.escape(mt.location || '鈥?)}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${this.utils.escape((mt.attendees || '').substring(0, 40))}${mt.attendees && mt.attendees.length > 40 ? '...' : ''}</div>
          <div class="detail-actions">
            <button class="btn btn-soft" onclick="event.stopPropagation();App.viewMeeting('${mt.id}')">鏌ョ湅</button>
            <button class="btn btn-danger" onclick="event.stopPropagation();App.deleteMeeting('${mt.id}')">鍒犻櫎</button>
          </div>
        </div>`;
      });
      html += '</div>';
    }
    html += `<div style="text-align:center;padding:16px"><button class="btn btn-primary" onclick="App.openMeetingForm()">馃 鏂板缓AI浼氳绠€璁?/button></div>`;
    document.getElementById('content').innerHTML = html;
  },

  /* ====== Gacha Game ====== */
  renderGachaGame() {
    this.renderTopbar({ title: '鎵泲鏈? });
    const html = `<div class="gacha-machine fade-in">
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">馃幇 浠婃棩鎵泲</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px">鐐瑰嚮鎵泲鏈猴紝鎶藉彇浠婃棩娲诲姩</div>
      <div class="gacha-body" id="gachaBody" onclick="App.spinGacha()">
        <div class="gacha-dome">
          <div class="gacha-capsule" id="gachaCapsule" style="display:none">馃巵</div>
        </div>
        <div class="gacha-base"></div>
        <div class="gama-handle"></div>
      </div>
      <div id="gachaResult" style="margin-top:20px;min-height:60px"></div>
    </div>`;
    document.getElementById('content').innerHTML = html;
  },

  spinGacha() {
    const body = document.getElementById('gachaBody');
    const capsule = document.getElementById('gachaCapsule');
    const result = document.getElementById('gachaResult');
    body.style.transform = 'scale(0.95)';
    capsule.style.display = 'flex';
    capsule.textContent = '馃巵';
    setTimeout(() => {
      body.style.transform = '';
      const item = GAMES_DATA.gachaActivities[Math.floor(Math.random() * GAMES_DATA.gachaActivities.length)];
      capsule.textContent = item.emoji;
      result.innerHTML = `<div class="card fade-in" style="text-align:center;border:2px solid ${item.color}44">
        <div style="font-size:40px;margin-bottom:8px">${item.emoji}</div>
        <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:4px">${this.utils.escape(item.text)}</div>
        <div style="font-size:12px;color:var(--text-muted)">蹇幓瀹屾垚鍚э紒鉂わ笍</div>
      </div>`;
    }, 600);
  },

  /* ====== Couple Quiz Game ====== */
  renderCoupleQuizGame() {
    this.renderTopbar({ title: '榛樺闂瓟' });
    this.state.coupleQuizIdx = 0;
    this.renderCoupleQuiz();
  },

  renderCoupleQuiz() {
    const idx = this.state.coupleQuizIdx || 0;
    const q = GAMES_DATA.quizzes[idx];
    if (!q) {
      document.getElementById('content').innerHTML = `<div class="empty-state fade-in">
        <div class="empty-state-icon">馃帀</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">鍏ㄩ儴绛斿畬鍟︼紒</div>
        <button class="btn btn-primary" onclick="App.renderCoupleQuizGame()">鍐嶆潵涓€杞?/button>
      </div>`;
      return;
    }
    let html = `<div class="card fade-in">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">绗?${idx + 1} / ${GAMES_DATA.quizzes.length} 棰?/div>
      <div class="quiz-question">${this.utils.escape(q.q)}</div>
      <div class="quiz-options">`;
    q.options.forEach((opt, i) => {
      html += `<div class="quiz-option" onclick="App.answerCoupleQuiz(${i})">
        <div class="quiz-option-letter">${String.fromCharCode(65 + i)}</div>
        <span>${this.utils.escape(opt)}</span>
      </div>`;
    });
    html += `</div>
      <div class="detail-actions">
        <button class="btn btn-soft" onclick="App.nextCoupleQuiz()">璺宠繃</button>
      </div>
    </div>`;
    document.getElementById('content').innerHTML = html;
  },

  answerCoupleQuiz(i) {
    this.utils.toast('宸查€夋嫨锛岀偣鍑昏烦杩囪繘鍏ヤ笅涓€棰?);
    const opts = document.querySelectorAll('.quiz-option');
    opts.forEach((el, j) => {
      if (j === i) {
        el.style.borderColor = '#FF6B9D';
        el.style.background = '#FFF5F9';
      }
      el.style.pointerEvents = 'none';
    });
  },

  nextCoupleQuiz() {
    this.state.coupleQuizIdx = (this.state.coupleQuizIdx || 0) + 1;
    this.renderCoupleQuiz();
  },

  /* ====== Memory Game ====== */
  renderMemoryGame() {
    this.renderTopbar({ title: '璁板繂閰嶅' });
    const emojis = GAMES_DATA.memoryPairs;
    const cards = this.utils.shuffle([...emojis, ...emojis]);
    this.state.memoryCards = cards;
    this.state.memoryFlipped = [];
    this.state.memoryMatched = [];
    this.state.memoryMoves = 0;
    let html = `<div style="text-align:center;margin-bottom:16px">
      <div style="font-size:18px;font-weight:700">馃儚 璁板繂閰嶅</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:4px">姝ユ暟: <span id="memMoves">0</span> 路 宸查厤瀵? <span id="memMatched">0</span>/${emojis.length}</div>
    </div>
    <div class="memory-board fade-in" id="memoryBoard">`;
    cards.forEach((emoji, i) => {
      html += `<div class="memory-card" data-idx="${i}" onclick="App.flipMemoryCard(${i})">
        <div class="memory-card-inner">
          <div class="memory-card-front">?</div>
          <div class="memory-card-back">${emoji}</div>
        </div>
      </div>`;
    });
    html += '</div>';
    html += '<div style="text-align:center;margin-top:16px"><button class="btn btn-soft" onclick="App.renderMemoryGame()">閲嶆柊寮€濮?/button></div>';
    document.getElementById('content').innerHTML = html;
  },

  flipMemoryCard(i) {
    const cards = document.querySelectorAll('.memory-card');
    const card = cards[i];
    if (!card) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (this.state.memoryFlipped.length >= 2) return;
    card.classList.add('flipped');
    this.state.memoryFlipped.push(i);
    if (this.state.memoryFlipped.length === 2) {
      this.state.memoryMoves++;
      document.getElementById('memMoves').textContent = this.state.memoryMoves;
      const [a, b] = this.state.memoryFlipped;
      if (this.state.memoryCards[a] === this.state.memoryCards[b]) {
        setTimeout(() => {
          cards[a].classList.add('matched');
          cards[b].classList.add('matched');
          this.state.memoryMatched.push(a, b);
          this.state.memoryFlipped = [];
          document.getElementById('memMatched').textContent = this.state.memoryMatched.length / 2;
          if (this.state.memoryMatched.length === this.state.memoryCards.length) {
            this.utils.toast('鎭枩鍏ㄩ儴閰嶅鎴愬姛锛侌煄?);
            setTimeout(() => {
              const gs = this.state.data.gameState;
              gs.totalHearts = (gs.totalHearts || 0) + 1;
              this.store.save();
            }, 500);
          }
        }, 400);
      } else {
        setTimeout(() => {
          cards[a].classList.remove('flipped');
          cards[b].classList.remove('flipped');
          this.state.memoryFlipped = [];
        }, 800);
      }
    }
  },

  /* ====== Truth or Dare Game ====== */
  renderTruthDareGame() {
    this.renderTopbar({ title: '鐪熷績璇濆ぇ鍐掗櫓' });
    const html = `<div class="fade-in" style="text-align:center;padding:20px">
      <div style="font-size:18px;font-weight:700;margin-bottom:20px">馃拫 鐪熷績璇濆ぇ鍐掗櫓</div>
      <div id="tdResult" style="min-height:120px;display:flex;align-items:center;justify-content:center">
        <div style="font-size:40px;opacity:0.3">馃憞 閫夋嫨寮€濮?/div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:20px">
        <button class="btn btn-primary" style="background:#FF6B9D" onclick="App.pickTruthDare('truth')">鐪熷績璇?馃挰</button>
        <button class="btn btn-primary" style="background:#FFB7D5" onclick="App.pickTruthDare('dare')">澶у啋闄?馃敟</button>
      </div>
    </div>`;
    document.getElementById('content').innerHTML = html;
  },

  pickTruthDare(type) {
    const arr = type === 'truth' ? GAMES_DATA.truths : GAMES_DATA.dares;
    const item = arr[Math.floor(Math.random() * arr.length)];
    const result = document.getElementById('tdResult');
    const color = type === 'truth' ? '#FF6B9D' : '#FFB7D5';
    result.innerHTML = `<div class="card fade-in" style="max-width:400px;text-align:center;border:2px solid ${color}44">
      <div style="font-size:14px;font-weight:600;color:${color};margin-bottom:8px">${type === 'truth' ? '馃挰 鐪熷績璇? : '馃敟 澶у啋闄?}</div>
      <div style="font-size:16px;font-weight:600;color:var(--text-primary);line-height:1.6">${this.utils.escape(item)}</div>
    </div>`;
  },

  /* ====== Sweet Wheel Game ====== */
  renderSweetWheelGame() {
    this.renderTopbar({ title: '鐢滆湝杞洏' });
    const html = `<div class="wheel-container fade-in">
      <div style="font-size:18px;font-weight:700;margin-bottom:16px">馃帯 鐢滆湝鎯呰瘽杞洏</div>
      <div class="wheel" id="sweetWheel" onclick="App.spinSweetWheel()">
        <div class="wheel-emoji">馃挄</div>
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">鐐瑰嚮杞洏寮€濮?/div>
      <div id="sweetResult" style="min-height:60px"></div>
    </div>`;
    document.getElementById('content').innerHTML = html;
  },

  spinSweetWheel() {
    const wheel = document.getElementById('sweetWheel');
    wheel.classList.add('spinning');
    document.getElementById('sweetResult').innerHTML = '';
    setTimeout(() => {
      wheel.classList.remove('spinning');
      const word = GAMES_DATA.sweetWords[Math.floor(Math.random() * GAMES_DATA.sweetWords.length)];
      document.getElementById('sweetResult').innerHTML = `<div class="card fade-in" style="text-align:center;border:2px solid #FFB7D544">
        <div style="font-size:16px;font-weight:600;color:#FF6B9D;line-height:1.6">${this.utils.escape(word)}</div>
      </div>`;
    }, 1500);
  },

  /* ====== Bucket List Game ====== */
  renderBucketListGame() {
    this.renderTopbar({ title: '蹇冩効娓呭崟' });
    const gs = this.state.data.gameState;
    const done = gs.bucketListDone || [];
    let html = `<div style="text-align:center;margin-bottom:16px">
      <div style="font-size:18px;font-weight:700">馃搵 鎯呬荆蹇冩効娓呭崟</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:4px">宸插畬鎴?${done.length} / ${GAMES_DATA.bucketList.length}</div>
      <div class="progress-bar" style="margin-top:8px;max-width:300px;margin-left:auto;margin-right:auto"><div class="progress-fill" style="width:${Math.round(done.length / GAMES_DATA.bucketList.length * 100)}%;background:#FF6B9D"></div></div>
    </div>`;
    GAMES_DATA.bucketList.forEach((item, i) => {
      const isDone = done.includes(i);
      html += `<div class="checklist-item ${isDone ? 'done' : ''}" onclick="App.toggleBucket(${i})">
        <div class="checklist-check">${isDone ? '鉁? : ''}</div>
        <div class="checklist-text">${this.utils.escape(item)}</div>
      </div>`;
    });
    document.getElementById('content').innerHTML = html;
  },

  toggleBucket(i) {
    const gs = this.state.data.gameState;
    if (!gs.bucketListDone) gs.bucketListDone = [];
    const idx = gs.bucketListDone.indexOf(i);
    if (idx >= 0) {
      gs.bucketListDone.splice(idx, 1);
    } else {
      gs.bucketListDone.push(i);
      gs.totalHearts = (gs.totalHearts || 0) + 1;
      this.utils.toast('瀹屾垚涓€椤癸紒+1 鉂わ笍');
    }
    this.store.save();
    this.renderBucketListGame();
  },

  /* ====== Quiz Mode (鍒烽) ====== */
  openQuiz() {
    this.state.quizPool = null;
    this.openQuizWithPool(null);
  },

  openQuizGroup(groupKey) {
    this.openQuizWithPool(groupKey);
  },

  openQuizWithPool(groupKey) {
    const pool = typeof QUIZ_POOL !== 'undefined' ? QUIZ_POOL : QUIZ_BANK;
    let quizBank = groupKey ? pool.filter(q => q.cat === groupKey || groupKey === 'all') : pool;
    if (quizBank.length === 0) quizBank = pool;
    this.state.currentQuizBank = this.utils.shuffle(quizBank);
    this.state.quizIdx = 0;
    this.state.quizAnswered = false;
    this.state.quizSelected = -1;
    this.state.quizGroupSize = quizBank.length;
    this.setSubView('quizMode');
  },

  renderQuizMode() {
    this.renderTopbar({ title: '鍒烽妯″紡' });
    const qp = this.state.data.quizProgress;
    const idx = this.state.quizIdx;
    const bank = this.state.currentQuizBank || QUIZ_BANK;
    if (idx >= bank.length) {
      const rate = qp.answered > 0 ? Math.round(qp.correct / qp.answered * 100) : 0;
      const html = `<div class="card fade-in" style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">馃帀</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:16px">鏈疆鍒烽瀹屾垚锛?/div>
        <div style="font-size:14px;color:var(--text-secondary);line-height:2">
          鏈疆棰樻暟锛?{bank.length}<br>
          宸茬瓟棰樻暟锛?{qp.answered}<br>
          姝ｇ‘棰樻暟锛?{qp.correct}<br>
          姝ｇ‘鐜囷細${rate}%
        </div>
        <div class="detail-actions" style="justify-content:center">
          <button class="btn btn-primary" onclick="App.openQuiz()">鍐嶆潵涓€杞?/button>
          <button class="btn btn-soft" onclick="App.navigate('exam')">杩斿洖</button>
        </div>
      </div>`;
      document.getElementById('content').innerHTML = html;
      return;
    }
    const q = bank[idx];
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:13px;color:var(--text-muted)">绗?${idx + 1} / ${bank.length} 棰?/div>
      <span class="badge" style="background:var(--primary-light);color:var(--primary-dark)">${this.utils.escape(q.cat)}</span>
    </div>
    <div class="progress-bar" style="margin-bottom:16px"><div class="progress-fill" style="width:${Math.round(idx / bank.length * 100)}%;background:var(--primary)"></div></div>
    <div class="card fade-in">
      <div class="quiz-question">${this.utils.escape(q.q)}</div>
      <div class="quiz-options" id="quizOpts">`;
    q.options.forEach((opt, i) => {
      html += `<div class="quiz-option" id="qopt${i}" onclick="App.answerQuiz(${i})">
        <div class="quiz-option-letter">${String.fromCharCode(65 + i)}</div>
        <span>${this.utils.escape(opt)}</span>
      </div>`;
    });
    html += '</div>';
    if (this.state.quizAnswered) {
      html += `<div id="quizExplain" class="card" style="margin-top:12px;background:#FFF8E1;border-color:#FFE082">
        <div style="font-size:13px;font-weight:700;color:#F57F17;margin-bottom:4px">馃摑 瑙ｆ瀽</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">${this.utils.escape(q.explain)}</div>
      </div>`;
      html += `<div class="detail-actions"><button class="btn btn-primary" onclick="App.nextQuiz()">涓嬩竴棰?鈫?/button></div>`;
    }
    html += '</div>';
    html += `<div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:12px">宸茬瓟 ${qp.answered} 路 姝ｇ‘ ${qp.correct}</div>`;
    document.getElementById('content').innerHTML = html;
  },

  answerQuiz(i) {
    if (this.state.quizAnswered) return;
    const bank = this.state.currentQuizBank || QUIZ_BANK;
    const q = bank[this.state.quizIdx];
    const correct = i === q.a;
    this.state.quizAnswered = true;
    this.state.quizSelected = i;
    const opts = document.querySelectorAll('.quiz-option');
    opts.forEach((el, j) => {
      el.style.pointerEvents = 'none';
      if (j === q.a) {
        el.style.borderColor = '#4FBE7E';
        el.style.background = '#E8F8EE';
        el.querySelector('.quiz-option-letter').style.background = '#4FBE7E';
        el.querySelector('.quiz-option-letter').style.color = '#fff';
        el.querySelector('.quiz-option-letter').style.borderColor = '#4FBE7E';
      } else if (j === i) {
        el.style.borderColor = '#FF6B6B';
        el.style.background = '#FFEEEE';
        el.querySelector('.quiz-option-letter').style.background = '#FF6B6B';
        el.querySelector('.quiz-option-letter').style.color = '#fff';
        el.querySelector('.quiz-option-letter').style.borderColor = '#FF6B6B';
      }
    });
    const qp = this.state.data.quizProgress;
    if (!qp.wrongIds) qp.wrongIds = [];
    if (!qp.wrongIds.includes(q.id)) {
      qp.answered++;
      if (correct) {
        qp.correct++;
      } else {
        qp.wrongIds.push(q.id);
      }
      this.store.save();
    }
    setTimeout(() => this.renderQuizMode(), 100);
  },

  nextQuiz() {
    this.state.quizIdx++;
    this.state.quizAnswered = false;
    this.state.quizSelected = -1;
    this.renderQuizMode();
  },

  /* ====== AI Meeting Brief Generator ====== */
  openMeetingForm() {
    this.state.meetingFiles = { photos: [], docs: [], contentExtracted: '', rawFiles: [] };
    this.state.meetingAgendas = [];
    this.state.briefMode = 'auto';
    const m = MODULES[2];
    const html = `<div class="modal-header">
      <div class="modal-title">馃 AI浼氳绠€璁敓鎴?/div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div class="meeting-form" id="meetingForm">
      <div class="meeting-section" style="background:linear-gradient(135deg,#F3E5F5,#E8EAF6);border-radius:12px;padding:16px">
        <div style="font-size:13px;color:#6A1B9A;line-height:1.6">
          馃挕 <b>AI鏅鸿兘鐢熸垚</b>锛氫笂浼犱細璁潗鏂欐枃浠讹紙褰曢煶杞枃瀛楃銆佽绋嬫枃妗ｃ€佹墜鍐欑瑪璁扮瓑锛夛紝AI灏嗚嚜鍔ㄥ垎鏋愬唴瀹癸紝鐢熸垚缁撴瀯瀹屾暣銆佽瑷€涓撲笟鐨勪細璁畝璁€?        </div>
      </div>
      <div class="meeting-section">
        <div class="meeting-section-title">馃搨 涓婁紶浼氳鏉愭枡 <span style="font-size:11px;color:var(--text-muted);font-weight:400">锛堟敮鎸佸涓枃浠讹級</span></div>
        <div class="file-upload-area" id="fileDropZone" onclick="document.getElementById('mtMaterials').click()" style="border:2px dashed #B89EE8;background:#F8F4FF;cursor:pointer">
          <div style="font-size:28px;margin-bottom:6px">馃搨</div>
          <div style="font-size:14px;font-weight:600;color:#6A1B9A">鐐瑰嚮涓婁紶鎴栨嫋鎷芥枃浠?/div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">鏀寔 .txt / .md 鏂囨湰鏂囦欢锛堝綍闊宠浆鏂囧瓧绋裤€佽绋嬨€佺瑪璁扮瓑锛?/div>
        </div>
        <input type="file" id="mtMaterials" accept=".txt,.md,text/*" multiple style="display:none" onchange="App.handleMaterialUpload(this)">
        <div id="materialList" style="margin-top:10px"></div>
        <div id="extractedContent" style="display:none;margin-top:10px"></div>
      </div>
      <div class="meeting-section">
        <div class="meeting-section-title">馃搵 鍩烘湰淇℃伅 <span style="font-size:11px;color:var(--text-muted);font-weight:400">锛堝彲閫夛紝AI鍙嚜鍔ㄦ彁鍙栵級</span></div>
        <div class="form-row"><div class="form-label">浼氳涓婚</div>
          <input class="form-input" id="mtTitle" placeholder="渚嬶細淇℃伅鎶€鏈闄㈠宸ヤ緥浼?>
        </div>
        <div class="form-row"><div class="form-label">鏃ユ湡</div>
          <input class="form-input" id="mtDate" type="date" value="${this.utils.formatDate(new Date())}">
        </div>
        <div class="form-row"><div class="form-label">鍦扮偣</div>
          <input class="form-input" id="mtLocation" placeholder="渚嬶細琛屾斂妤?02浼氳瀹?>
        </div>
        <div class="form-row"><div class="form-label">鍙備細浜哄憳</div>
          <input class="form-input" id="mtAttendees" placeholder="渚嬶細鏅撴檽銆佸紶鑰佸笀銆佹潕鑰佸笀...">
        </div>
        <div class="form-row"><div class="form-label">涓绘寔浜?璁板綍浜?/div>
          <input class="form-input" id="mtRecorder" placeholder="渚嬶細鏅撴檽锛堜富鎸佸吋璁板綍锛?>
        </div>
      </div>
      <div class="meeting-section">
        <div class="meeting-section-title">馃摲 浼氳鐓х墖 <span style="font-size:11px;color:var(--text-muted);font-weight:400">锛堝彲閫夛級</span></div>
        <div class="file-upload-area" onclick="document.getElementById('mtPhotos').click()">
          <div style="font-size:24px;margin-bottom:4px">馃摲</div>
          <div style="font-size:13px;color:var(--text-muted)">鐐瑰嚮涓婁紶浼氳鐜板満鐓х墖</div>
        </div>
        <input type="file" id="mtPhotos" accept="image/*" multiple style="display:none" onchange="App.handlePhotoUpload(this)">
        <div class="photo-preview" id="photoPreview"></div>
      </div>
      <button class="btn btn-primary btn-block" onclick="App.generateBriefing()" id="btnGenerateBrief" style="font-size:16px;padding:14px">
        馃 AI鐢熸垚浼氳绠€璁?      </button>
    </div>`;
    this.showModal(html);
    // Setup drag-drop
    setTimeout(() => {
      const zone = document.getElementById('fileDropZone');
      if (!zone) return;
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = '#7C4DFF'; zone.style.background = '#EDE7F6'; });
      zone.addEventListener('dragleave', () => { zone.style.borderColor = '#B89EE8'; zone.style.background = '#F8F4FF'; });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = '#B89EE8'; zone.style.background = '#F8F4FF';
        this.processMaterialFiles(Array.from(e.dataTransfer.files));
      });
    }, 100);
  },

  handleMaterialUpload(input) {
    this.processMaterialFiles(Array.from(input.files));
  },

  async processMaterialFiles(files) {
    let allContent = '';
    const validFiles = [];
    for (const f of files) {
      // Try to read text content
      try {
        const text = await this.utils.readFileAsText(f);
        if (text && text.trim().length > 0) {
          allContent += `\n=== 鏂囦欢锛?{f.name} ===\n${text}\n`;
          validFiles.push({ name: f.name, size: f.size, extracted: true, preview: text.substring(0, 200) });
        } else {
          validFiles.push({ name: f.name, size: f.size, extracted: false, preview: '' });
        }
      } catch (e) {
        validFiles.push({ name: f.name, size: f.size, extracted: false, preview: '' });
      }
    }
    this.state.meetingFiles.docs = [...this.state.meetingFiles.docs, ...validFiles];
    this.state.meetingFiles.contentExtracted += allContent;
    this.state.meetingFiles.rawFiles = [...(this.state.meetingFiles.rawFiles || []), ...files];
    this.renderMaterialList();
    if (allContent.trim()) {
      this.showExtractedPreview();
    }
  },

  renderMaterialList() {
    const el = document.getElementById('materialList');
    if (!el) return;
    const files = this.state.meetingFiles.docs;
    if (files.length === 0) { el.innerHTML = ''; return; }
    const totalChars = (this.state.meetingFiles.contentExtracted || '').length;
    let html = `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">宸蹭笂浼?${files.length} 涓枃浠讹紝鍏辨彁鍙?${totalChars} 瀛楃</div>`;
    files.forEach((d, i) => {
      html += `<div class="file-tag" style="display:flex;align-items:center;justify-content:space-between">
        <span>${d.extracted ? '鉁? : '鈿狅笍'} ${this.utils.escape(d.name)} <span style="color:var(--text-muted);font-size:11px">(${this.utils.formatSize(d.size)})</span></span>
        <span style="cursor:pointer;margin-left:8px" onclick="App.removeMaterial(${i})">脳</span>
      </div>`;
    });
    if (totalChars > 0) {
      html += `<div style="margin-top:8px;text-align:right"><button class="btn btn-soft" style="font-size:12px;padding:4px 10px" onclick="App.showExtractedPreview()">馃搫 鏌ョ湅鎻愬彇鍐呭</button></div>`;
    }
    el.innerHTML = html;
  },

  removeMaterial(i) {
    const removed = this.state.meetingFiles.docs[i];
    if (removed && removed.extracted) {
      // Remove extracted content for this file
      const pattern = `\n=== 鏂囦欢锛?{removed.name} ===\n`;
      const idx = this.state.meetingFiles.contentExtracted.indexOf(pattern);
      if (idx >= 0) {
        const nextIdx = this.state.meetingFiles.contentExtracted.indexOf('\n=== 鏂囦欢锛?, idx + pattern.length);
        if (nextIdx >= 0) {
          this.state.meetingFiles.contentExtracted = this.state.meetingFiles.contentExtracted.substring(0, idx) + this.state.meetingFiles.contentExtracted.substring(nextIdx);
        } else {
          this.state.meetingFiles.contentExtracted = this.state.meetingFiles.contentExtracted.substring(0, idx);
        }
      }
    }
    this.state.meetingFiles.docs.splice(i, 1);
    this.renderMaterialList();
  },

  showExtractedPreview() {
    const el = document.getElementById('extractedContent');
    if (!el) return;
    const content = this.state.meetingFiles.contentExtracted || '';
    if (!content.trim()) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const preview = content.length > 500 ? content.substring(0, 500) + '\n\n... (鍐呭宸插畬鏁存彁鍙栵紝鍏?' + content.length + ' 瀛楃)' : content;
    el.innerHTML = `<div style="background:#F5F5F5;border-radius:8px;padding:12px;font-size:12px;color:#333;white-space:pre-wrap;max-height:200px;overflow-y:auto;line-height:1.6">${this.utils.escape(preview)}</div>`;
  },

  generateBriefing() {
    const title = document.getElementById('mtTitle').value.trim();
    const date = document.getElementById('mtDate').value;
    const location = document.getElementById('mtLocation').value.trim();
    const attendees = document.getElementById('mtAttendees').value.trim();
    const recorder = document.getElementById('mtRecorder').value.trim();
    const extractedContent = this.state.meetingFiles.contentExtracted || '';
    const fileCount = this.state.meetingFiles.docs.length;

    if (!extractedContent.trim() && !title) {
      this.utils.toast('璇峰厛涓婁紶浼氳鏉愭枡鏂囦欢鎴栧～鍐欎細璁富棰?);
      return;
    }

    // Show generating animation
    document.getElementById('btnGenerateBrief').innerHTML = '鈴?AI姝ｅ湪鍒嗘瀽鏉愭枡骞剁敓鎴愮畝璁?..';
    document.getElementById('btnGenerateBrief').disabled = true;

    // Simulate AI processing delay
    setTimeout(() => {
      const briefing = this.buildBriefing({ title, date, location, attendees, recorder, extractedContent, fileCount });
      this.closeModal();
      this.showBriefingOutput(briefing.text, briefing.data);
    }, 600);
  },

  buildBriefing({ title, date, location, attendees, recorder, extractedContent, fileCount }) {
    // Extract key info
    const lines = extractedContent.split('\n').filter(l => l.trim());
    const contentText = lines.join('\n');

    // Auto-extract title
    let autoTitle = title;
    if (!autoTitle && contentText) {
      const titleMatch = contentText.match(/(?:浼氳涓婚|涓婚|浼氳鍚嶇О|鏍囬)[:锛歕s]*([^\n]{2,50})/);
      if (titleMatch) autoTitle = titleMatch[1].trim();
      else autoTitle = this.utils.extractFirstLine(contentText, 40);
    }
    const fullTitle = autoTitle || '(寰呰ˉ鍏?';

    // Extract attendees
    let autoAttendees = attendees;
    if (!autoAttendees && contentText) {
      const attMatch = contentText.match(/(?:鍙備細浜哄憳|鍑哄腑|鍙傚姞|涓庝細)[:锛歕s]*([^\n]{2,100})/);
      if (attMatch) autoAttendees = attMatch[1].trim();
    }

    // Extract location
    let autoLocation = location;
    if (!autoLocation && contentText) {
      const locMatch = contentText.match(/(?:鍦扮偣|浼氳瀹鍦板潃|鍙紑鍦扮偣)[:锛歕s]*([^\n]{2,50})/);
      if (locMatch) autoLocation = locMatch[1].trim();
    }

    // Segment content
    const segments = this.utils.segmentContent(contentText);
    const topics = segments.filter(s => s.type === 'topic');
    const decisions = segments.filter(s => s.type === 'decision');
    const actions = segments.filter(s => s.type === 'action');

    // Build Xinhua/People's Daily style briefing
    const lines_out = [];
    const now = new Date();
    const y = now.getFullYear(); const m = now.getMonth() + 1; const d = now.getDate();

    // Title
    lines_out.push('銆愪細璁畝璁€?);
    lines_out.push('');
    lines_out.push(`銆€銆€${fullTitle}`);
    if (autoAttendees) {
      lines_out.push(`    鈥斺€?{autoAttendees}鍑哄腑`);
    }
    lines_out.push('');

    // Byline (鏂板崕绀?浜烘皯鏃ユ姤 style)
    lines_out.push(`銆€銆€鏈姤璁?锛堣鑰?鏅撴檽锛?{y}骞?{m}鏈?{d}鏃?{autoTitle ? '锛?' + fullTitle + '"' : ''}${autoLocation ? '鍦? + autoLocation : ''}鍙紑銆?{autoAttendees ? autoAttendees : '鐩稿叧璐熻矗鍚屽織'}鍑哄腑浼氳銆俙);
    lines_out.push('');

    // Lead paragraph - summarize the meeting
    const overview = this.utils.summarizeContent(contentText, 200);
    if (overview) {
      lines_out.push(`銆€銆€浼氳鎸囧嚭锛?{overview.replace(/鏈浼氳/g, '').replace(/浼氳/g, '')}`);
    } else {
      lines_out.push(`銆€銆€浼氳灏辫繎鏈熼噸鐐瑰伐浣滆繘琛屼簡娣卞叆鐮旇鍜岄儴缃诧紝鏄庣‘浜嗕笅涓€闃舵鐨勫伐浣滄柟鍚戝拰閲嶇偣浠诲姟銆俙);
    }
    lines_out.push('');

    // Body - Topics & Discussion
    if (topics.length > 0) {
      if (topics.length === 1) {
        lines_out.push(`銆€銆€浼氫笂锛屼笌浼氫汉鍛樺洿缁?${topics[0].title || '鐩稿叧璁'}"杩涜浜嗕笓棰樼爺璁ㄣ€?{topics[0].content ? topics[0].content.substring(0, 250) : '鐩稿叧璐熻矗浜哄湪浼氫笂浣滀簡涓撻姹囨姤锛屼笌浼氫汉鍛樺氨鏈夊叧闂杩涜浜嗘繁鍏ヤ氦娴併€?}`);
        lines_out.push('');
      } else {
        lines_out.push(`銆€銆€浼氳鏈熼棿锛屼笌浼氫汉鍛樺洿缁曚互涓嬭棰樿繘琛屼簡娣卞叆鐮旇锛歚);
        lines_out.push('');
        topics.forEach((t, i) => {
          lines_out.push(`銆€銆€${i + 1}. ${t.title || '璁 ' + (i + 1)}`);
          if (t.content) lines_out.push(`銆€銆€   ${t.content.substring(0, 200)}`);
        });
        lines_out.push('');
      }
    } else if (contentText) {
      const paragraphs = contentText.split(/\n{2,}/).filter(p => p.trim().length > 30);
      if (paragraphs.length > 0) {
        lines_out.push(`銆€銆€鎹倝锛屼細璁噸鐐瑰洿缁曚互涓嬪伐浣滃睍寮€鐮旇锛歚);
        lines_out.push('');
        paragraphs.slice(0, 4).forEach((p, i) => {
          lines_out.push(`銆€銆€${i + 1}. ${this.utils.extractTopicTitle(p, i)}`);
          lines_out.push(`銆€銆€   ${p.trim().substring(0, 200)}`);
        });
        lines_out.push('');
      }
    }

    // Decisions
    lines_out.push('銆€銆€銆愬喅璁簨椤广€?);
    lines_out.push('');
    if (decisions.length > 0) {
      decisions.forEach((d, i) => {
        lines_out.push(`銆€銆€浼氳鍐冲畾锛?{d.content || '灏辩浉鍏充簨椤逛綔鍑哄喅璁?}`);
      });
    } else {
      const decisionLines = contentText.split('\n').filter(l =>
        /(?:鍐冲畾|鍐宠|閫氳繃|纭|鍚屾剰|鎵瑰噯|鏄庣‘|瑕佹眰|鎸囧嚭|寮鸿皟)/.test(l) && l.trim().length > 10
      );
      if (decisionLines.length > 0) {
        decisionLines.slice(0, 5).forEach(l => {
          lines_out.push(`銆€銆€${l.trim().substring(0, 200)}`);
        });
      } else {
        lines_out.push('銆€銆€锛堟牴鎹細璁潗鏂欏垎鏋愶紝寰呰ˉ鍏呭喅璁唴瀹癸級');
      }
    }
    lines_out.push('');

    // Action Plan
    lines_out.push('銆€銆€銆愬伐浣滈儴缃层€?);
    lines_out.push('');
    if (actions.length > 0) {
      actions.forEach((a, i) => {
        let item = `銆€銆€${i + 1}. ${a.content || '寰呭姙浜嬮」 ' + (i + 1)}`;
        if (a.deadline) item += `锛堟埅姝㈡椂闂达細${a.deadline}锛塦;
        lines_out.push(item);
      });
    } else {
      const actionLines = contentText.split('\n').filter(l =>
        /(?:涓嬩竴姝寰呭姙|璺熻繘|钀藉疄|鎺ㄨ繘|瀹屾垚|璐熻矗|鎴|鏈熼檺|璁″垝|瀹夋帓)/.test(l) && l.trim().length > 10
      );
      if (actionLines.length > 0) {
        actionLines.slice(0, 5).forEach((l, i) => {
          lines_out.push(`銆€銆€${i + 1}. ${l.trim().substring(0, 200)}`);
        });
      } else {
        lines_out.push('銆€銆€锛堟牴鎹細璁潗鏂欏垎鏋愶紝寰呰ˉ鍏呭伐浣滈儴缃插唴瀹癸級');
      }
    }
    lines_out.push('');

    // Conclusion
    lines_out.push(`銆€銆€浼氳寮鸿皟锛屽悇鐩稿叧閮ㄩ棬瑕佹寜鐓т細璁儴缃茶姹傦紝鍔犲己缁熺鍗忚皟锛岀粏鍖栬矗浠诲垎宸ワ紝纭繚鍚勯」宸ヤ綔浠诲姟鎸夋椂淇濊川瀹屾垚锛屼负鎺ㄥ姩${autoTitle ? '"' + autoTitle.replace(/浼氳|鐮旂┒|宸ヤ綔/g, '') + '"鐩稿叧宸ヤ綔' : '鍚勯」宸ヤ綔'}楂樿川閲忓彂灞曟彁渚涙湁鍔涗繚闅溿€俙);
    lines_out.push('');

    // Footer
    lines_out.push('鈥?.repeat(30));
    lines_out.push(`锛堟湰绠€璁敱AI鏅鸿兘鐢熸垚锛屽唴瀹瑰熀浜庝笂浼?{fileCount || 0}浠戒細璁潗鏂欒嚜鍔ㄥ垎鏋愭暣鐞嗭級`);
    lines_out.push(`${y}骞?{m}鏈?{d}鏃);

    const fullText = lines_out.join('\n');

    return {
      text: fullText,
      headline: fullTitle,
      data: {
        title: autoTitle,
        headline: fullTitle,
        date,
        location: autoLocation,
        attendees: autoAttendees,
        recorder,
        topics,
        decisions,
        actions,
        fileCount,
        mode: 'ai-brief',
        photos: this.state.meetingFiles.photos,
        docs: this.state.meetingFiles.docs,
      }
    };
  },

  handlePhotoUpload(input) {
    const files = Array.from(input.files);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.state.meetingFiles.photos.push({ name: f.name, data: e.target.result });
        this.renderPhotoPreview();
      };
      reader.readAsDataURL(f);
    });
  },

  renderPhotoPreview() {
    const el = document.getElementById('photoPreview');
    if (!el) return;
    el.innerHTML = this.state.meetingFiles.photos.map((p, i) =>
      `<div style="position:relative;display:inline-block;margin:4px">
        <img src="${p.data}" class="photo-thumb" style="width:72px;height:72px;object-fit:cover;border-radius:8px">
        <button class="btn btn-danger" style="position:absolute;top:-6px;right:-6px;font-size:10px;padding:0;width:20px;height:20px;border-radius:50%" onclick="App.removePhoto(${i})">脳</button>
      </div>`
    ).join('');
  },

  removePhoto(i) {
    this.state.meetingFiles.photos.splice(i, 1);
    this.renderPhotoPreview();
  },

  showBriefingOutput(text, data) {
    const p = data.photos || [];
    const hasPhoto = p.length > 0;
    
    // Parse sections for newspaper layout
    const lines = text.split('\n');
    let titleLine = ''; let bylineLine = ''; let bodyHtml = '';
    let section = 'header';
    let bodyLines = [];
    let footerLines = [];
    
    lines.forEach((line, idx) => {
      if (idx === 0 && line === '銆愪細璁畝璁€?) return;
      if (idx === 1 && line === '') return;
      if (section === 'header') {
        if (line.trim() && !line.startsWith('銆€銆€')) {
          titleLine = line.trim();
          return;
        }
        if (line.trim().startsWith('鈥斺€?)) {
          titleLine += ' ' + line.trim();
          return;
        }
        if (line.trim() === '') { 
          if (titleLine) section = 'body';
          return; 
        }
      }
      if (section === 'body') {
        if (line.startsWith('鈥?.repeat(10))) {
          section = 'footer';
          return;
        }
        bodyLines.push(line);
        return;
      }
      if (section === 'footer') {
        if (line.trim()) footerLines.push(line);
      }
    });

    // Build body HTML with section styling
    bodyHtml = bodyLines.map(l => {
      const t = l.trim();
      if (t.startsWith('銆愬喅璁簨椤广€?) || t.startsWith('銆愬伐浣滈儴缃层€?)) {
        return `<div style="font-weight:700;color:#c00;font-size:16px;margin:18px 0 8px;padding-bottom:6px;border-bottom:2px solid #c00;letter-spacing:2px">${t}</div>`;
      }
      if (t.startsWith('浼氳鍐冲畾锛?)) {
        return `<div style="padding:4px 0;text-indent:2em;line-height:1.9">鉁?${t}</div>`;
      }
      if (/^\d+\./.test(t)) {
        return `<div style="padding:3px 0 3px 1em;text-indent:0;line-height:1.9">馃搵 ${t}</div>`;
      }
      return `<div style="text-indent:2em;line-height:1.9;padding:2px 0">${t}</div>`;
    }).join('');

    // Build photo gallery inline (insert after first 2-3 paragraphs)
    let photoHtml = '';
    if (hasPhoto) {
      photoHtml = `<div style="margin:16px 0;text-align:center;background:#f5f5f5;border-radius:8px;padding:12px">
        <div style="display:flex;gap:8px;overflow-x:auto;justify-content:center;flex-wrap:wrap">
          ${p.map((ph, pi) => `<div style="text-align:center;max-width:${p.length > 2 ? '30%' : '45%'}">
            <img src="${ph.data}" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;border:1px solid #eee" alt="${ph.name}">
            <div style="font-size:11px;color:#888;margin-top:4px">${ph.name}</div>
          </div>`).join('')}
        </div>
        <div style="font-size:12px;color:#999;margin-top:8px">鈻?浼氳鐜板満鐓х墖</div>
      </div>`;
    }

    const html = `<div class="modal-header" style="border-bottom:2px solid #c00">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="background:#c00;color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:700">鏂板崕缃?/span>
        <div class="modal-title" style="color:#333">AI浼氳绠€璁瑙?/div>
      </div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div id="meetingOutput" style="max-height:60vh;overflow-y:auto;padding:20px 24px;background:#fff;font-family:'PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif;font-size:15px;color:#222;line-height:1.8">
      <!-- Newspaper header -->
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:12px;color:#999;letter-spacing:3px;margin-bottom:6px">MEETING BRIEF 路 浼氳绠€璁?/div>
        <div style="width:60px;height:3px;background:#c00;margin:0 auto 16px"></div>
        <div style="font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:1px;line-height:1.4">${(data.headline || data.title) || '浼氳绠€璁?}</div>
        ${data.attendees ? `<div style="font-size:15px;color:#666;margin-top:8px;font-weight:500">鈥斺€?{data.attendees}鍑哄腑</div>` : ''}
      </div>
      
      <!-- Byline bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;margin-bottom:20px;font-size:12px;color:#888">
        <span>馃摪 鏂板崕缃?路 AI浼氳绠€璁?/span>
        <span>${data.date || this.utils.todayKey()}</span>
        ${data.location ? `<span>馃搷 ${data.location}</span>` : ''}
      </div>
      
      <!-- Body content -->
      <div style="font-size:15px;color:#333;line-height:2">
        ${bodyHtml}
      </div>
      
      ${photoHtml}
      
      <!-- Footer -->
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center">
        <div>${footerLines.join(' 路 ') || '鏈畝璁敱AI鏅鸿兘鐢熸垚'}</div>
      </div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-soft" onclick="App.copyBriefing()">馃搵 澶嶅埗绠€璁?/button>
      <button class="btn btn-primary" onclick="App.saveBriefing()">馃捑 淇濆瓨绠€璁?/button>
    </div>`;
    this.showModal(html);
    this.state.lastMeetingText = text;
    this.state.lastMeetingData = data;
  },

  copyBriefing() {
    const text = this.state.lastMeetingText || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => this.utils.toast('绠€璁凡澶嶅埗鍒板壀璐存澘'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.utils.toast('绠€璁凡澶嶅埗鍒板壀璐存澘');
    }
  },

  saveBriefing() {
    const data = this.state.lastMeetingData;
    if (!data) return;
    const briefing = {
      id: this.utils.uid(),
      title: data.title || '浼氳绠€璁?,
      headline: data.headline || data.title || '浼氳绠€璁?,
      date: data.date,
      location: data.location,
      attendees: data.attendees,
      recorder: data.recorder,
      text: this.state.lastMeetingText,
      topics: data.topics || [],
      decisions: data.decisions || [],
      actions: data.actions || [],
      fileCount: data.fileCount || 0,
      mode: 'ai-brief',
      photos: (data.photos || []).map(p => ({ name: p.name })),
      docs: (data.docs || []).map(d => ({ name: d.name, extracted: d.extracted })),
      createdAt: new Date().toISOString(),
    };
    if (!this.state.data.meetings) this.state.data.meetings = [];
    this.state.data.meetings.push(briefing);
    this.store.save();
    this.closeModal();
    this.utils.toast('浼氳绠€璁凡淇濆瓨');
    this.render();
  },

  viewMeeting(id) {
    const mt = (this.state.data.meetings || []).find(x => x.id === id);
    if (!mt) return;
    const text = mt.text || '';
    const lines = text.split('\n');
    let bodyLines = [];
    let section = 'header';
    let titleLine = mt.headline || mt.title || '';
    
    lines.forEach(line => {
      if (section === 'header') {
        if (line === '銆愪細璁畝璁€? || line === '') return;
        if (!titleLine && line.trim()) { titleLine = line.trim(); return; }
        if (line.trim().startsWith('鈥斺€?)) { titleLine += ' ' + line.trim(); return; }
        if (line.trim() === '') { section = 'body'; return; }
        return;
      }
      if (section === 'body') {
        if (line.startsWith('鈥?.repeat(10))) return;
        bodyLines.push(line);
      }
    });

    const bodyHtml = bodyLines.map(l => {
      const t = l.trim();
      if (t.startsWith('銆愬喅璁簨椤广€?) || t.startsWith('銆愬伐浣滈儴缃层€?)) {
        return `<div style="font-weight:700;color:#c00;font-size:16px;margin:18px 0 8px;padding-bottom:6px;border-bottom:2px solid #c00;letter-spacing:2px">${t}</div>`;
      }
      if (t.startsWith('浼氳鍐冲畾锛?)) return `<div style="padding:4px 0;text-indent:2em;line-height:1.9">鉁?${t}</div>`;
      if (/^\d+\./.test(t)) return `<div style="padding:3px 0 3px 1em;text-indent:0;line-height:1.9">馃搵 ${t}</div>`;
      return `<div style="text-indent:2em;line-height:1.9;padding:2px 0">${t}</div>`;
    }).join('');

    const html = `<div class="modal-header" style="border-bottom:2px solid #c00">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="background:#c00;color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:700">鏂板崕缃?/span>
        <div class="modal-title" style="color:#333">${this.utils.escape(titleLine)}</div>
      </div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div style="max-height:60vh;overflow-y:auto;padding:16px 24px;background:#fff;font-family:'PingFang SC','Microsoft YaHei',sans-serif;font-size:15px;color:#222;line-height:1.8">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;margin-bottom:16px;font-size:12px;color:#888">
        <span>馃摪 鏂板崕缃?路 AI浼氳绠€璁?/span>
        <span>${mt.date || ''}</span>
        ${mt.location ? `<span>馃搷 ${mt.location}</span>` : ''}
      </div>
      <div style="font-size:15px;color:#333;line-height:2">${bodyHtml}</div>
      <div style="margin-top:20px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center">
        <div>鏈畝璁敱AI鏅鸿兘鐢熸垚 路 ${mt.createdAt ? new Date(mt.createdAt).toLocaleDateString('zh-CN') : ''}</div>
      </div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-soft" onclick="App.copyBriefingText('${mt.id}')">馃搵 澶嶅埗</button>
      <button class="btn btn-danger" onclick="App.deleteMeeting('${mt.id}')">馃棏锔?鍒犻櫎</button>
    </div>`;
    this.showModal(html);
  },

  copyBriefingText(id) {
    const mt = (this.state.data.meetings || []).find(x => x.id === id);
    if (!mt) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mt.text).then(() => this.utils.toast('宸插鍒?));
    } else {
      const ta = document.createElement('textarea');
      ta.value = mt.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.utils.toast('宸插鍒?);
    }
  },

  deleteMeeting(id) {
    if (!confirm('纭畾鍒犻櫎杩欐潯浼氳璁板綍鍚楋紵')) return;
    this.state.data.meetings = (this.state.data.meetings || []).filter(x => x.id !== id);
    this.store.save();
    this.closeModal();
    this.utils.toast('宸插垹闄?);
    if (this.state.subView === 'meetings') this.renderMeetingsList();
    else this.render();
  },

  /* ====== Resume Modification ====== */
  openResumeForm() {
    this.state.resumeFile = null;
    const m = MODULES[1];
    let jobOptions = JOB_RECS.map(j => `<option value="${j.id}">${this.utils.escape(j.company)} - ${this.utils.escape(j.position)}</option>`).join('');
    const html = `<div class="modal-header">
      <div class="modal-title">馃摑 绠€鍘嗘櫤鑳戒慨鏀?/div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div class="meeting-form">
      <div class="meeting-section">
        <div class="meeting-section-title">馃搸 涓婁紶绠€鍘?/div>
        <div class="file-upload-area" onclick="document.getElementById('resumeFile').click()">
          <div style="font-size:24px;margin-bottom:4px">馃搫</div>
          <div style="font-size:13px;color:var(--text-muted)" id="resumeFileName">鐐瑰嚮涓婁紶绠€鍘嗘枃浠?(PDF/Word/鍥剧墖)</div>
        </div>
        <input type="file" id="resumeFile" style="display:none" onchange="App.handleResumeUpload(this)">
      </div>
      <div class="meeting-section">
        <div class="meeting-section-title">馃搵 鍩烘湰淇℃伅</div>
        <div class="form-row"><div class="form-label">瀛︾敓濮撳悕</div>
          <input class="form-input" id="rsName" placeholder="瀛︾敓濮撳悕">
        </div>
        <div class="form-row"><div class="form-label">姹傝亴鎰忓悜</div>
          <input class="form-input" id="rsIntention" placeholder="渚嬶細鍓嶇寮€鍙戝伐绋嬪笀">
        </div>
        <div class="form-row"><div class="form-label">鐩爣鍏徃/宀椾綅</div>
          <select class="form-select" id="rsJob">
            <option value="">璇烽€夋嫨鐩爣宀椾綅</option>
            ${jobOptions}
            <option value="custom">鑷畾涔?/option>
          </select>
        </div>
        <div class="form-row" id="customJobRow" style="display:none">
          <div class="form-label">鑷畾涔夊矖浣?/div>
          <input class="form-input" id="rsCustomJob" placeholder="杈撳叆鐩爣鍏徃/宀椾綅">
        </div>
      </div>
      <button class="btn btn-primary btn-block" onclick="App.generateResumeSuggestions()">鐢熸垚淇敼寤鸿</button>
      ${this.state.data.resumes && this.state.data.resumes.length > 0 ? `
        <div class="meeting-section">
          <div class="meeting-section-title">馃搨 宸蹭繚瀛樼畝鍘?(${this.state.data.resumes.length})</div>
          ${this.state.data.resumes.slice().reverse().map(r => `
            <div class="agenda-item">
              <div style="font-size:13px;font-weight:600">${this.utils.escape(r.studentName)} - ${this.utils.escape(r.intention)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${this.utils.escape(r.company)}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${this.utils.escape(r.date)}</div>
              <div class="detail-actions">
                <button class="btn btn-soft" style="font-size:12px;padding:4px 10px" onclick="App.viewResume('${r.id}')">鏌ョ湅</button>
                <button class="btn btn-danger" style="font-size:12px;padding:4px 10px" onclick="App.deleteResume('${r.id}')">鍒犻櫎</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>`;
    this.showModal(html);
    document.getElementById('rsJob').addEventListener('change', (e) => {
      document.getElementById('customJobRow').style.display = e.target.value === 'custom' ? 'flex' : 'none';
    });
  },

  handleResumeUpload(input) {
    const f = input.files[0];
    if (!f) return;
    this.state.resumeFile = { name: f.name, size: f.size, type: f.type };
    document.getElementById('resumeFileName').textContent = '宸蹭笂浼? ' + f.name;
  },

  generateResumeSuggestions() {
    const name = document.getElementById('rsName').value.trim();
    const intention = document.getElementById('rsIntention').value.trim();
    const jobId = document.getElementById('rsJob').value;
    let company = '';
    let job = null;
    if (jobId === 'custom') {
      company = document.getElementById('rsCustomJob').value.trim();
    } else if (jobId) {
      job = JOB_RECS.find(j => j.id === jobId);
      company = job ? `${job.company} - ${job.position}` : '';
    }
    if (!name) { this.utils.toast('璇疯緭鍏ュ鐢熷鍚?); return; }
    if (!intention) { this.utils.toast('璇疯緭鍏ユ眰鑱屾剰鍚?); return; }

    let suggestions = `鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣\n`;
    suggestions += `   绠€鍘嗕慨鏀瑰缓璁姤鍛奬n`;
    suggestions += `鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣\n\n`;
    suggestions += `馃懁 瀛︾敓濮撳悕锛?{name}\n`;
    suggestions += `馃幆 姹傝亴鎰忓悜锛?{intention}\n`;
    suggestions += `馃彚 鐩爣宀椾綅锛?{company || '鏈寚瀹?}\n`;
    if (this.state.resumeFile) {
      suggestions += `馃搫 绠€鍘嗘枃浠讹細${this.state.resumeFile.name}\n`;
    }
    suggestions += `\n`;

    if (job) {
      suggestions += `鈹佲攣鈹?宀椾綅瑕佹眰鍒嗘瀽 鈹佲攣鈹乗n\n`;
      suggestions += `鍏徃锛?{job.company}\n`;
      suggestions += `钖祫锛?{job.salary}\n`;
      suggestions += `鍦扮偣锛?{job.location}\n`;
      suggestions += `鎶€鏈爣绛撅細${job.tags.join('銆?)}\n`;
      suggestions += `宀椾綅鎻忚堪锛?{job.desc}\n`;
      suggestions += `鍏徃绠€浠嬶細${job.profile}\n\n`;
    }

    suggestions += `鈹佲攣鈹?绠€鍘嗕紭鍖栧缓璁?鈹佲攣鈹乗n\n`;
    RESUME_TIPS.forEach((tip, i) => {
      suggestions += `${i + 1}. ${tip.title}\n`;
      suggestions += `   ${tip.content}\n\n`;
    });

    if (job) {
      suggestions += `鈹佲攣鈹?閽堝鎬у缓璁?鈹佲攣鈹乗n\n`;
      suggestions += `1. 鎶€鑳藉尮閰嶏細纭繚绠€鍘嗕腑绐佸嚭 ${job.tags.join('銆?)} 鐩稿叧鎶€鑳藉拰椤圭洰缁忛獙\n`;
      suggestions += `2. 鍏抽敭璇嶏細鍦ㄧ畝鍘嗕腑鍔犲叆宀椾綅JD涓殑鍏抽敭璇嶏紝鎻愰珮绠€鍘嗙瓫閫夐€氳繃鐜嘰n`;
      suggestions += `3. 椤圭洰缁忓巻锛氱敤STAR娉曞垯鎻忚堪涓?{job.company}涓氬姟鐩稿叧鐨勯」鐩甛n`;
      suggestions += `4. 鍏徃浜嗚В锛氬湪鑷垜璇勪环涓綋鐜板${job.company}浜у搧鍜屼笟鍔＄殑鐞嗚В\n`;
      suggestions += `5. 鎶曢€掗摼鎺ワ細${job.url}\n\n`;
    }

    suggestions += `鈹佲攣鈹?绠€鍘嗙粨鏋勬鏌?鈹佲攣鈹乗n\n`;
    suggestions += `鈻?涓汉淇℃伅锛堝鍚嶃€佺數璇濄€侀偖绠便€丟itHub锛塡n`;
    suggestions += `鈻?鏁欒偛鑳屾櫙锛堝鏍°€佷笓涓氥€丟PA鍙€夛級\n`;
    suggestions += `鈻?涓撲笟鎶€鑳斤紙鍒嗙被鍒楀嚭锛屾爣娉ㄧ啛缁冨害锛塡n`;
    suggestions += `鈻?椤圭洰缁忓巻锛?-3涓紝STAR娉曞垯锛塡n`;
    suggestions += `鈻?瀹炰範缁忓巻锛堝鏈夛級\n`;
    suggestions += `鈻?鑾峰璇佷功\n`;
    suggestions += `鈻?鑷垜璇勪环锛堢畝鐭湁鍔涳級\n\n`;
    suggestions += `鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣\n`;
    suggestions += `鐢熸垚鏃堕棿锛?{this.utils.formatDateTime(new Date())}\n`;

    this.closeModal();
    this.showResumeResult(suggestions, { name, intention, company, job });
  },

  showResumeResult(text, data) {
    const html = `<div class="modal-header">
      <div class="modal-title">馃摑 绠€鍘嗕慨鏀瑰缓璁?/div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div class="meeting-output">${this.utils.escape(text)}</div>
    ${data.job ? `<div style="margin-top:12px"><a href="${data.job.url}" target="_blank" class="btn btn-primary btn-block" style="text-decoration:none;display:block;text-align:center">鍓嶅線鎶曢€?鈫?/a></div>` : ''}
    <div class="detail-actions">
      <button class="btn btn-soft" onclick="App.copyResume('${data.name.replace(/'/g, "\\'")}')">澶嶅埗</button>
      <button class="btn btn-primary" onclick="App.saveResume()">淇濆瓨璁板綍</button>
    </div>`;
    this.showModal(html);
    this.state.lastResumeText = text;
    this.state.lastResumeData = data;
  },

  copyResume(name) {
    const text = this.state.lastResumeText || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => this.utils.toast('宸插鍒?));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.utils.toast('宸插鍒?);
    }
  },

  saveResume() {
    const data = this.state.lastResumeData;
    if (!data) return;
    const record = {
      id: this.utils.uid(),
      studentName: data.name,
      intention: data.intention,
      company: data.company || '',
      jobId: data.job ? data.job.id : '',
      text: this.state.lastResumeText,
      fileName: this.state.resumeFile ? this.state.resumeFile.name : '',
      date: this.utils.formatDate(new Date()),
      createdAt: new Date().toISOString(),
    };
    if (!this.state.data.resumes) this.state.data.resumes = [];
    this.state.data.resumes.push(record);
    this.store.save();
    this.closeModal();
    this.utils.toast('绠€鍘嗚褰曞凡淇濆瓨');
    this.render();
  },

  viewResume(id) {
    const r = (this.state.data.resumes || []).find(x => x.id === id);
    if (!r) return;
    const html = `<div class="modal-header">
      <div class="modal-title">馃摑 ${this.utils.escape(r.studentName)} 鐨勭畝鍘嗗缓璁?/div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div class="meeting-output">${this.utils.escape(r.text)}</div>
    <div class="detail-actions">
      <button class="btn btn-soft" onclick="App.copyResumeText('${r.id}')">澶嶅埗</button>
      <button class="btn btn-danger" onclick="App.deleteResume('${r.id}')">鍒犻櫎</button>
    </div>`;
    this.showModal(html);
  },

  copyResumeText(id) {
    const r = (this.state.data.resumes || []).find(x => x.id === id);
    if (!r) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(r.text).then(() => this.utils.toast('宸插鍒?));
    } else {
      const ta = document.createElement('textarea');
      ta.value = r.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.utils.toast('宸插鍒?);
    }
  },

  deleteResume(id) {
    if (!confirm('纭畾鍒犻櫎杩欐潯绠€鍘嗚褰曞悧锛?)) return;
    this.state.data.resumes = (this.state.data.resumes || []).filter(x => x.id !== id);
    this.store.save();
    this.closeModal();
    this.utils.toast('宸插垹闄?);
    this.render();
  },

  /* ====== Notes ====== */
  renderNotes(category) {
    const notes = this.state.data.notes[category] || [];
    let html = '<div class="section-title"><span class="emoji">馃棐</span>鎴戠殑绗旇</div>';
    html += '<div class="card">';
    html += '<div style="display:flex;gap:8px;margin-bottom:12px">';
    html += '<input class="form-input" id="noteInput_' + category + '" placeholder="鍐欑偣浠€涔?.." style="flex:1" onkeydown="if(event.key===\'Enter\')App.addNote(\'' + category + '\')">';
    html += `<button class="btn btn-primary" onclick="App.addNote('${category}')">娣诲姞</button>`;
    html += '</div>';
    if (notes.length === 0) {
      html += '<div class="empty-state"><div class="empty-state-icon">馃摑</div>鏆傛棤绗旇</div>';
    } else {
      notes.forEach((n, i) => {
        html += `<div class="list-item" style="background:var(--bg-card)">
          <div class="list-item-body">
            <div class="list-item-title">${this.utils.escape(n.text)}</div>
            <div class="list-item-desc">${this.utils.escape(n.date)}</div>
          </div>
          <button class="btn btn-danger" style="font-size:12px;padding:4px 8px" onclick="App.deleteNote('${category}',${i})">脳</button>
        </div>`;
      });
    }
    html += '</div>';
    return html;
  },

  addNote(category) {
    const input = document.getElementById('noteInput_' + category);
    if (!input || !input.value.trim()) return;
    if (!this.state.data.notes[category]) this.state.data.notes[category] = [];
    this.state.data.notes[category].push({
      text: input.value.trim(),
      date: this.utils.formatDateTime(new Date()),
    });
    this.store.save();
    this.render();
    this.utils.toast('绗旇宸叉坊鍔?);
  },

  deleteNote(category, i) {
    this.state.data.notes[category].splice(i, 1);
    this.store.save();
    this.render();
  },

  /* ====== Resources ====== */
  renderResources(category) {
    const resources = RESOURCES[category] || [];
    let html = '<div class="section-title"><span class="emoji">馃敆</span>璧勬簮閾炬帴</div>';
    html += '<div class="grid grid-2">';
    resources.forEach(r => {
      html += `<div class="card clickable" onclick="App.utils.openUrl('${r.url}')">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">${r.emoji || '馃敆'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--text-primary)">${this.utils.escape(r.name)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${this.utils.escape(r.desc || '')}</div>
          </div>
          <span style="font-size:16px;color:var(--text-muted)">鈫?/span>
        </div>
      </div>`;
    });
    html += '</div>';
    return html;
  },

  /* ====== Detail Views ====== */
  renderDetail() {
    const d = this.state.detail;
    if (!d) return;
    this.renderTopbar({ title: '璇︽儏' });
    const content = document.getElementById('content');
    content.className = 'fade-in';
    switch (d.type) {
      case 'news': this.detailNews(content, d.id); break;
      case 'policy': this.detailPolicy(content, d.id); break;
      case 'paper': this.detailPaper(content, d.id); break;
      case 'question': this.detailQuestion(content, d.id); break;
      case 'book': this.detailBook(content, d.id); break;
      case 'cat': this.detailCat(content, d.id); break;
      case 'relationship': this.detailRelationship(content, d.id); break;
      case 'student': this.detailStudent(content, d.id); break;
      case 'job': this.detailJob(content, d.id); break;
      case 'hobby': this.detailHobby(content, d.id); break;
      case 'ability': this.detailAbility(content, d.id); break;
      case 'knowledge': this.detailKnowledge(content, d.id); break;
      case 'shanghai': this.detailShanghai(content, d.id); break;
      default: content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">馃攳</div>璇︽儏涓嶅瓨鍦?/div>';
    }
  },

  detailNews(el, idData) {
    let cat, idx;
    try {
      const parsed = JSON.parse(idData);
      cat = parsed.cat;
      idx = parsed.idx;
    } catch (e) { el.innerHTML = '<div class="empty-state">鏁版嵁閿欒</div>'; return; }
    const items = this.state.newsData[cat] || NEWS_POOL[cat] || [];
    const item = items[idx];
    if (!item) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">馃摥</div>鏂伴椈涓嶅瓨鍦?/div>'; return; }
    const sourceColor = cat === 'politics' ? MODULES[3].colorDark : (cat === 'social' ? '#FF6B6B' : 'var(--primary-dark)');
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:${sourceColor}22;color:${sourceColor}">${this.utils.escape(item.source || '鏂伴椈')}</span>
    </div>
    <div class="detail-title">${this.utils.escape(item.title)}</div>
    <div class="detail-meta"><span class="tag">${this.utils.escape(cat)}</span></div>
    <div class="detail-body"><p>${this.utils.nl2br(item.detail || item.summary || '')}</p></div>
    ${item.url ? `<div class="detail-actions"><a href="${item.url}" target="_blank" class="btn btn-primary" style="text-decoration:none">鏌ョ湅鍘熸枃 鈫?/a></div>` : ''}`;
  },

  detailShanghai(el, idData) {
    let cat, idx;
    try { const p = JSON.parse(idData); cat = p.cat; idx = p.idx; }
    catch (e) { el.innerHTML = '<div class="empty-state">鏁版嵁閿欒</div>'; return; }
    const items = SHANGHAI_NEWS[cat] || [];
    const item = items[idx];
    if (!item) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">馃摥</div>鍐呭涓嶅瓨鍦?/div>'; return; }
    const catInfo = SHANGHAI_CATEGORIES.find(c => c.key === cat);
    const color = catInfo ? catInfo.color : '#E74C3C';
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:${color}22;color:${color}">${this.utils.escape(item.source || '')}</span>
      ${item.date ? `<span class="tag">${this.utils.escape(item.date)}</span>` : ''}
      ${catInfo ? `<span class="tag" style="background:${color}22;color:${color}">${catInfo.emoji} ${catInfo.label}</span>` : ''}
    </div>
    <div class="detail-title">${this.utils.escape(item.title)}</div>
    <div class="detail-body"><p>${this.utils.nl2br(item.detail || item.summary || '')}</p></div>
    ${item.url ? `<div class="detail-actions"><a href="${item.url}" target="_blank" class="btn btn-primary" style="text-decoration:none">鏌ョ湅鍘熸枃 鈫?/a></div>` : ''}`;
  },

  detailPolicy(el, id) {
    const p = POLICIES.find(x => x.id === id);
    if (!p) { el.innerHTML = '<div class="empty-state">鏀跨瓥涓嶅瓨鍦?/div>'; return; }
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:var(--primary-light);color:var(--primary-dark)">${this.utils.escape(p.tag)}</span>
      <span class="tag">${this.utils.escape(p.date)}</span>
    </div>
    <div class="detail-title">${this.utils.escape(p.title)}</div>
    <div class="detail-body">${this.utils.nl2br(p.detail)}</div>`;
  },

  detailPaper(el, id) {
    const p = PAPERS_POOL.find(x => x.id === id) || PAPERS.find(x => x.id === id);
    if (!p) { el.innerHTML = '<div class="empty-state">璁烘枃涓嶅瓨鍦?/div>'; return; }
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:var(--primary-light);color:var(--primary-dark)">${this.utils.escape(p.tag)}</span>
      <span class="tag">${this.utils.escape(p.date)}</span>
    </div>
    <div class="detail-title">${this.utils.escape(p.title)}</div>
    <div class="detail-meta"><span class="tag">馃摉 ${this.utils.escape(p.journal)}</span></div>
    <div class="detail-body">${this.utils.nl2br(p.detail)}</div>`;
  },

  detailQuestion(el, id) {
    const q = EXAM_QUESTIONS.find(x => x.id === id);
    if (!q) { el.innerHTML = '<div class="empty-state">棰樼洰涓嶅瓨鍦?/div>'; return; }
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:var(--primary-light);color:var(--primary-dark)">${this.utils.escape(q.tag)}</span>
    </div>
    <div class="detail-title">${this.utils.escape(q.q)}</div>
    <div class="detail-body">
      <h4>鉁?鍙傝€冪瓟妗?/h4><p>${this.utils.nl2br(q.a)}</p>
      <h4>馃摑 瑙ｆ瀽</h4><p>${this.utils.nl2br(q.detail)}</p>
    </div>`;
  },

  detailBook(el, id) {
    const b = BOOKS_POOL.find(x => x.id === id) || BOOKS.find(x => x.id === id);
    if (!b) { el.innerHTML = '<div class="empty-state">涔︾睄涓嶅瓨鍦?/div>'; return; }
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:${b.color}22;color:${b.colorDark || b.color}">${b.emoji} ${this.utils.escape(b.tag)}</span>
      <span class="tag">${this.utils.escape(b.status)}</span>
    </div>
    <div class="detail-title">${this.utils.escape(b.title)}</div>
    <div class="detail-meta"><span class="tag">鉁嶏笍 ${this.utils.escape(b.author)}</span></div>
    <div class="detail-body">
      <p>${this.utils.escape(b.summary)}</p>
      <p>${this.utils.nl2br(b.desc)}</p>
    </div>
    <div class="detail-actions">
      <a href="${b.links.weread}" target="_blank" class="btn btn-primary" style="text-decoration:none">馃摉 寰俊璇讳功</a>
      <a href="${b.links.douban}" target="_blank" class="btn btn-soft" style="text-decoration:none">猸?璞嗙摚</a>
    </div>`;
  },

  detailCat(el, id) {
    const c = CAT_CARE.find(x => x.id === id);
    if (!c) { el.innerHTML = '<div class="empty-state">鍐呭涓嶅瓨鍦?/div>'; return; }
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:#FFE0E0;color:#E74C3C">${c.emoji} 鐚挭鍏绘姢</span>
    </div>
    <div class="detail-title">${this.utils.escape(c.title)}</div>
    <div class="detail-body">${this.utils.nl2br(c.detail)}</div>`;
  },

  detailRelationship(el, idx) {
    const r = RELATIONSHIP[parseInt(idx)];
    if (!r) { el.innerHTML = '<div class="empty-state">鍐呭涓嶅瓨鍦?/div>'; return; }
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:#FFE0EC;color:#C2185B">${r.emoji} 鎯呮劅缁忚惀</span>
    </div>
    <div class="detail-title">${this.utils.escape(r.title)}</div>
    <div class="detail-body">${this.utils.nl2br(r.detail)}</div>`;
  },

  getStudent(id) {
    const s = STUDENTS.find(x => x.id === id);
    if (!s) return null;
    const edit = this.state.data.studentEdits && this.state.data.studentEdits[id];
    return edit ? Object.assign({}, s, edit) : s;
  },

  detailStudent(el, id) {
    const s = this.getStudent(id);
    if (!s) { el.innerHTML = '<div class="empty-state">瀛︾敓涓嶅瓨鍦?/div>'; return; }
    const sc = STATUS_MAP[s.status] || { color: '#F0F0F0', text: '#999', label: s.status };
    const avatarColors = ['#5BB5E8', '#7FD4A8', '#B89EE8', '#FFC088', '#FF9A92', '#FFD966', '#FFA8C8'];
    const avatarColor = avatarColors[s.name.charCodeAt(0) % avatarColors.length];
    el.innerHTML = `<div class="detail-header">
      <div class="student-avatar" style="background:${avatarColor};width:56px;height:56px;font-size:22px">${this.utils.escape(s.name.charAt(0))}</div>
      <div>
        <div class="detail-title" style="margin-bottom:4px">${this.utils.escape(s.name)}</div>
        <span class="detail-badge" style="background:${sc.color};color:${sc.text}">${sc.label}</span>
      </div>
    </div>
    <div class="detail-body">
      <p>馃懁 鎬у埆锛?{s.gender === '濂? ? '濂? : '鐢?}</p>
      <p>馃摎 涓撲笟锛?{this.utils.escape(s.major)}</p>
      <p>馃彨 鐝骇锛?{this.utils.escape(s.cls)}</p>
      <p>馃彚 鍏徃锛?{s.company ? this.utils.escape(s.company) : '鏆傛棤'}</p>
      <p>馃捈 宀椾綅锛?{s.position ? this.utils.escape(s.position) : '鏆傛棤'}</p>
      <p>馃挵 钖祫锛?{s.salary ? this.utils.escape(s.salary) : '鏆傛棤'}</p>
      <p>馃搵 瑙勫垝锛?{s.plan ? this.utils.escape(s.plan) : '鏆傛棤'}</p>
      <p>馃摓 鑱旂郴鏃ユ湡锛?{this.utils.escape(s.contact || '鏆傛棤')}</p>
    </div>
    <div class="detail-actions">
      <button class="btn btn-primary btn-block" onclick="App.editStudent('${id}')">鉁忥笍 缂栬緫瀛︾敓淇℃伅</button>
    </div>`;
  },

  editStudent(id) {
    const s = this.getStudent(id);
    if (!s) return;
    const statusOptions = Object.keys(STATUS_MAP).map(k =>
      `<option value="${k}" ${s.status === k ? 'selected' : ''}>${STATUS_MAP[k].label}</option>`
    ).join('');
    this.showModal(`<div class="modal-header">
      <div class="modal-title">鉁忥笍 缂栬緫 - ${this.utils.escape(s.name)}</div>
      <button class="modal-close" onclick="App.closeModal()">脳</button>
    </div>
    <div style="padding:16px">
      <div style="margin-bottom:12px">
        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">灏变笟鐘舵€?/label>
        <select id="edit-status" class="form-select" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:#fff">
          ${statusOptions}
        </select>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">鍏徃/鍗曚綅</label>
        <input id="edit-company" class="form-input" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px" value="${this.utils.escape(s.company || '')}" placeholder="濡傦細鑵捐/鍗庝笢甯堣寖澶у/娴︿笢鏂板尯鍏姟鍛?>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">宀椾綅</label>
        <input id="edit-position" class="form-input" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px" value="${this.utils.escape(s.position || '')}" placeholder="濡傦細Java寮€鍙戝伐绋嬪笀/鑰冪爺褰曞彇/缁煎悎绠＄悊宀?>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">钖祫锛堟湀钖級</label>
        <input id="edit-salary" class="form-input" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px" value="${this.utils.escape(s.salary || '')}" placeholder="濡傦細12k-15k">
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">瑙勫垝/澶囨敞</label>
        <textarea id="edit-plan" class="form-input" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;min-height:60px" placeholder="濡傦細鍓嶇鏂瑰悜/鑰冪爺璁＄畻鏈烘柟鍚?鑰冨叕鏂瑰悜">${this.utils.escape(s.plan || '')}</textarea>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">鑱旂郴鏃ユ湡</label>
        <input id="edit-contact" type="date" class="form-input" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px" value="${this.utils.escape(s.contact || '')}">
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-soft" style="flex:1" onclick="App.closeModal()">鍙栨秷</button>
        <button class="btn btn-primary" style="flex:1" onclick="App.saveStudentEdit('${id}')">淇濆瓨</button>
      </div>
    </div>`);
  },

  saveStudentEdit(id) {
    const status = document.getElementById('edit-status').value;
    const company = document.getElementById('edit-company').value.trim();
    const position = document.getElementById('edit-position').value.trim();
    const salary = document.getElementById('edit-salary').value.trim();
    const plan = document.getElementById('edit-plan').value.trim();
    const contact = document.getElementById('edit-contact').value;
    if (!this.state.data.studentEdits) this.state.data.studentEdits = {};
    this.state.data.studentEdits[id] = { status, company, position, salary, plan, contact };
    this.store.save();
    this.closeModal();
    this.render();
    this.utils.toast('瀛︾敓淇℃伅宸蹭繚瀛?);
  },

  detailJob(el, id) {
    const j = JOB_RECS.find(x => x.id === id);
    if (!j) { el.innerHTML = '<div class="empty-state">宀椾綅涓嶅瓨鍦?/div>'; return; }
    const company = COMPANIES.find(c => c.name === j.company);
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:#FFE0E0;color:#E74C3C">${this.utils.escape(j.salary)}</span>
      <span class="tag">馃搷 ${this.utils.escape(j.location)}</span>
    </div>
    <div class="detail-title">${this.utils.escape(j.company)}</div>
    <div class="detail-meta"><span class="tag">馃捈 ${this.utils.escape(j.position)}</span></div>
    <div class="detail-body">
      <p>${this.utils.escape(j.desc)}</p>
      <h4>鎶€鏈姹?/h4>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${j.tags.map(t => `<span class="tag">${this.utils.escape(t)}</span>`).join('')}</div>
      ${company ? `<h4>鍏徃绠€浠?/h4><p>${this.utils.escape(company.desc)}</p><p><strong>琛屼笟锛?/strong>${this.utils.escape(company.industry)}</p><p><strong>瑙勬ā锛?/strong>${this.utils.escape(company.size)}</p><p><strong>鏂囧寲锛?/strong>${this.utils.escape(company.culture)}</p><p><strong>鎶€鏈爤锛?/strong>${this.utils.escape(company.tech)}</p>` : `<h4>鍏徃绠€浠?/h4><p>${this.utils.escape(j.profile)}</p>`}
    </div>
    <div class="detail-actions">
      <a href="${j.url}" target="_blank" class="btn btn-primary" style="text-decoration:none">绔嬪嵆鎶曢€?鈫?/a>
    </div>`;
  },

  detailHobby(el, id) {
    const h = HOBBIES.find(x => x.id === id);
    if (!h) { el.innerHTML = '<div class="empty-state">鍐呭涓嶅瓨鍦?/div>'; return; }
    let html = `<div class="detail-header">
      <span class="detail-badge" style="background:${h.color}22;color:${h.colorDark || h.color}">${h.emoji} 鍏磋叮鐖卞ソ</span>
    </div>
    <div class="detail-title">${h.emoji} ${this.utils.escape(h.name)}</div>
    <div class="detail-body">${this.utils.nl2br(h.detail)}</div>`;
    if (h.videos && h.videos.length > 0) {
      html += '<div class="section-title"><span class="emoji">馃幀</span>瑙嗛鏁欑▼</div>';
      h.videos.forEach(v => {
        html += `<div class="card clickable" onclick="App.utils.openUrl('${v.url}')">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">馃摵</span>
            <div style="flex:1;font-size:14px;font-weight:600;color:var(--text-primary)">${this.utils.escape(v.title)}</div>
            <span style="font-size:16px;color:var(--text-muted)">鈫?/span>
          </div>
        </div>`;
      });
    }
    if (h.resources && h.resources.length > 0) {
      html += '<div class="section-title"><span class="emoji">馃敆</span>鐩稿叧璧勬簮</div>';
      html += '<div class="grid grid-2">';
      h.resources.forEach(r => {
        html += `<div class="card clickable" onclick="App.utils.openUrl('${r.url}')">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">馃敆</span>
            <div style="flex:1;font-size:13px;font-weight:600;color:var(--text-primary)">${this.utils.escape(r.name)}</div>
          </div>
        </div>`;
      });
      html += '</div>';
    }
    el.innerHTML = html;
  },

  detailAbility(el, idx) {
    const a = ABILITY_FRAMEWORK[parseInt(idx)];
    if (!a) { el.innerHTML = '<div class="empty-state">鍐呭涓嶅瓨鍦?/div>'; return; }
    let html = `<div class="detail-header">
      <span class="detail-badge" style="background:var(--primary-light);color:var(--primary-dark)">${a.emoji} 鑳藉姏鎻愬崌</span>
    </div>
    <div class="detail-title">${a.emoji} ${this.utils.escape(a.name)}</div>`;
    // Z-gen vivid example - highlighted section
    if (a.zExample) {
      html += `<div class="card" style="border:2px solid #E65100;background:#FFF8E1;margin-bottom:16px;border-radius:12px;padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:22px">馃摉</span>
          <span style="font-size:15px;font-weight:700;color:#E65100">Z涓栦唬椴滄椿妗堜緥 鈥?00鍚庡ぇ瀛︾敓鐪熷疄鍦烘櫙</span>
        </div>
        <div style="font-size:14px;color:#4E342E;line-height:1.8;background:#FFF;padding:14px;border-radius:8px">${this.utils.nl2br(a.zExample)}</div>
      </div>`;
    }
    html += `<div class="detail-body">${this.utils.nl2br(a.detail)}</div>`;
    // Related daily tips
    const catName = a.name.replace('鑳藉姏', '');
    const relatedTips = DAILY_ABILITY_TIPS.filter(t => t.cat === catName);
    if (relatedTips.length > 0) {
      html += '<div class="section-title"><span class="emoji">馃挕</span>姣忔棩缁冧範鎶€宸?/div>';
      relatedTips.forEach(t => {
        html += `<div class="card" style="border-left:3px solid var(--primary);margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:20px">${t.emoji}</span>
            <span class="badge" style="background:var(--primary-light);color:var(--primary-dark)">${this.utils.escape(t.cat)}</span>
          </div>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px;line-height:1.5">${this.utils.escape(t.tip)}</div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;background:var(--bg-soft);padding:8px;border-radius:6px">
            <strong>馃摑 缁冧範锛?/strong>${this.utils.escape(t.practice)}
          </div>
        </div>`;
      });
    }
    if (a.resources && a.resources.length > 0) {
      html += '<div class="section-title"><span class="emoji">馃敆</span>瀛︿範璧勬簮</div>';
      html += '<div class="grid grid-2">';
      a.resources.forEach(r => {
        html += `<div class="card clickable" onclick="App.utils.openUrl('${r.url}')">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">馃敆</span>
            <div style="flex:1;font-size:13px;font-weight:600;color:var(--text-primary)">${this.utils.escape(r.name)}</div>
          </div>
        </div>`;
      });
      html += '</div>';
    }
    el.innerHTML = html;
  },

  detailKnowledge(el, idx) {
    const k = DAILY_KNOWLEDGE[parseInt(idx)];
    if (!k) { el.innerHTML = '<div class="empty-state">鍐呭涓嶅瓨鍦?/div>'; return; }
    el.innerHTML = `<div class="detail-header">
      <span class="detail-badge" style="background:var(--primary-light);color:var(--primary-dark)">${k.emoji} ${this.utils.escape(k.cat)}</span>
    </div>
    <div class="detail-title">${this.utils.escape(k.title)}</div>
    <div class="detail-body">${this.utils.nl2br(k.detail)}</div>`;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
