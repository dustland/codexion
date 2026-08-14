import type { IssueInboxSnapshot } from "../github/types.js";
import { CODEXION_VERSION } from "../version.js";

const HOST_ID = "codexion-issue-inbox-host";

export interface IssueInboxAction {
  force?: boolean;
  issueId?: string;
  maxAgeDays?: number | null;
  repository?: string;
  repositories?: string[];
  threadId?: string;
  type:
    | "handle"
    | "ignore"
    | "load-settings"
    | "refresh"
    | "resolve-current-repo"
    | "set-max-age"
    | "set-repositories"
    | "unignore";
  workspace?: string;
}

export const INSTALL_ISSUE_INBOX_EXPRESSION = `(() => {
  const hostId = ${JSON.stringify(HOST_ID)};
  const codexionVersion = ${JSON.stringify(CODEXION_VERSION)};
  window.__codexionIssueInboxCleanup?.();
  document.getElementById(hostId)?.remove();

  const host = document.createElement("span");
  host.id = hostId;
  host.style.display = "contents";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = \`
    <style>
      :host { color: inherit; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      button, input { font: inherit; }
      .trigger { align-items:center; background:transparent; border:0; border-radius:6px; color:var(--color-token-text-tertiary,rgba(0,0,0,.5)); cursor:pointer; display:flex; height:28px; justify-content:center; min-width:28px; padding:0 6px; position:relative; }
      .trigger:hover, .trigger[aria-expanded="true"] { background:color-mix(in oklab,currentColor 8%,transparent); }
      .trigger svg { height:15px; width:15px; }
      .badge { align-items:center; background:var(--color-token-text-primary,#202020); border:2px solid var(--color-token-bg-primary,#fff); border-radius:9px; color:var(--color-token-bg-primary,#fff); display:none; font-size:9px; font-weight:650; height:15px; justify-content:center; min-width:15px; padding:0 2px; position:absolute; right:0; top:0; }
      .badge[data-visible="true"] { display:flex; }
      .surface { background:var(--color-background-panel,var(--color-token-bg-primary,#fff)); border:1px solid color-mix(in oklab,currentColor 12%,transparent); border-radius:12px; box-shadow:0 14px 38px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.08); color:var(--color-token-text-primary,#202020); display:none; overflow:hidden; position:fixed; width:360px; z-index:2147483646; }
      .surface[data-open="true"] { display:block; }
      .header { align-items:center; border-bottom:1px solid color-mix(in oklab,currentColor 9%,transparent); display:flex; gap:8px; height:44px; padding:0 8px 0 14px; }
      .header-title { align-items:center; display:flex; font-size:13px; font-weight:600; gap:7px; }
      .header-title svg { flex:none; height:15px; width:15px; }
      .header-tools { align-items:center; display:flex; margin-left:auto; }
      .scope { align-items:center; background:transparent; border:0; border-radius:5px; color:var(--color-token-text-secondary,#555); cursor:pointer; display:flex; font-size:11px; gap:6px; height:28px; padding:0 7px; }
      .scope:hover { background:color-mix(in oklab,currentColor 8%,transparent); color:inherit; }
      .switch { background:color-mix(in oklab,currentColor 17%,transparent); border-radius:999px; display:block; height:14px; position:relative; transition:background 120ms ease-out; width:24px; }
      .switch::after { background:var(--color-token-bg-primary,#fff); border:1px solid color-mix(in oklab,currentColor 18%,transparent); border-radius:50%; box-sizing:border-box; content:""; height:12px; left:1px; position:absolute; top:1px; transition:transform 120ms ease-out; width:12px; }
      .scope[aria-checked="true"] .switch { background:var(--color-token-text-primary,#202020); }
      .scope[aria-checked="true"] .switch::after { transform:translateX(10px); }
      .icon-button { align-items:center; background:transparent; border:0; border-radius:5px; color:var(--color-token-text-tertiary,#777); cursor:pointer; display:inline-flex; height:28px; justify-content:center; padding:0 7px; }
      .icon-button svg, .action svg, .view-link svg { flex:none; height:14px; width:14px; }
      .icon-button:hover { background:color-mix(in oklab,currentColor 8%,transparent); color:inherit; }
      .list { max-height:min(520px,calc(100vh - 110px)); overflow:auto; padding:6px; }
      .empty { align-items:center; color:var(--color-token-text-tertiary,#777); display:flex; flex-direction:column; font-size:13px; gap:9px; line-height:18px; padding:32px 24px; text-align:center; }
      .empty svg { height:25px; opacity:.72; width:25px; }
      .older { border-top:1px solid color-mix(in oklab,currentColor 9%,transparent); margin-top:6px; padding-top:4px; }
      .older-head { color:var(--color-token-text-secondary,#555); font-size:11px; font-weight:600; padding:7px 9px 3px; }
      .older-toggle { background:transparent; border:0; border-radius:6px; color:var(--color-token-text-secondary,#555); cursor:pointer; font-size:11px; margin:2px 5px 5px; padding:6px 7px; text-align:left; width:calc(100% - 10px); }
      .older-toggle:hover { background:color-mix(in oklab,currentColor 5%,transparent); color:inherit; }
      .issue { border-radius:8px; padding:9px; position:relative; }
      .issue:hover { background:color-mix(in oklab,currentColor 5%,transparent); }
      .meta { color:var(--color-token-text-tertiary,#777); font-size:11px; margin-bottom:4px; padding-right:42px; }
      .age { color:var(--color-token-text-tertiary,#777); font-size:10px; font-variant-numeric:tabular-nums; position:absolute; right:9px; top:9px; }
      .title { font-size:13px; font-weight:590; line-height:18px; }
      .excerpt { color:var(--color-token-text-secondary,#555); display:-webkit-box; font-size:12px; line-height:17px; margin-top:3px; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
      .actions { align-items:center; display:flex; gap:6px; height:27px; margin-top:8px; opacity:0; pointer-events:none; transition:opacity 100ms ease-out; }
      .issue:hover .actions, .issue:focus-within .actions { opacity:1; pointer-events:auto; }
      .actions .push { margin-left:auto; }
      .action { align-items:center; background:transparent; border:1px solid color-mix(in oklab,currentColor 15%,transparent); border-radius:6px; color:inherit; cursor:pointer; display:inline-flex; font-size:12px; gap:5px; height:27px; padding:0 9px; }
      .action:hover { background:color-mix(in oklab,currentColor 7%,transparent); }
      .action.primary { background:var(--color-token-text-primary,#202020); color:var(--color-token-bg-primary,#fff); }
      .view-link { align-items:center; border-radius:5px; color:var(--color-token-text-secondary,#555); display:flex; font-size:12px; gap:5px; height:27px; padding:0 5px; text-decoration:none; }
      .view-link:hover { color:inherit; text-decoration:underline; }
      .dialog-backdrop { align-items:center; background:rgba(0,0,0,.28); display:none; inset:0; justify-content:center; position:fixed; z-index:2147483647; }
      .dialog-backdrop[data-open="true"] { display:flex; }
      .dialog { background:var(--color-background-panel,var(--color-token-bg-primary,#fff)); border:1px solid color-mix(in oklab,currentColor 12%,transparent); border-radius:14px; box-shadow:0 22px 60px rgba(0,0,0,.24); max-height:min(680px,calc(100vh - 64px)); overflow:hidden; width:560px; }
      .dialog-head { align-items:center; border-bottom:1px solid color-mix(in oklab,currentColor 9%,transparent); display:flex; height:52px; justify-content:space-between; padding:0 18px; }
      .dialog-title { font-size:15px; font-weight:620; }
      .dialog-body { max-height:560px; overflow:auto; padding:18px; }
      .status { background:color-mix(in oklab,currentColor 4%,transparent); border-radius:8px; color:var(--color-token-text-secondary,#555); font-size:12px; margin-bottom:14px; padding:10px 12px; }
      .repo-filter { background:transparent; border:1px solid color-mix(in oklab,currentColor 16%,transparent); border-radius:7px; box-sizing:border-box; color:inherit; height:34px; margin-bottom:10px; outline:none; padding:0 10px; width:100%; }
      .repos { border:1px solid color-mix(in oklab,currentColor 11%,transparent); border-radius:8px; max-height:360px; overflow:auto; }
      .repo { align-items:center; display:flex; gap:9px; min-height:38px; padding:0 10px; }
      .repo:hover { background:color-mix(in oklab,currentColor 5%,transparent); }
      .repo label { cursor:pointer; flex:1; font-size:13px; }
      .workspace { color:var(--color-token-text-tertiary,#777); font-size:10px; max-width:190px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .dialog-foot { align-items:center; border-top:1px solid color-mix(in oklab,currentColor 9%,transparent); display:flex; height:54px; justify-content:flex-end; gap:8px; padding:0 18px; }
      .error { color:#c33; font-size:12px; padding:7px 12px; }
    </style>
    <button class="trigger" aria-label="Open GitHub issue inbox" aria-expanded="false">
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.23.49-2.7-1.08-2.7-1.08-.37-.93-.9-1.18-.9-1.18-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82A7.6 7.6 0 0 1 8 3.73c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.74.54 1.5l-.01 2.31c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/></svg><span class="badge"></span>
    </button>
    <section class="surface" role="menu"><div class="header"><div class="header-title"><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.23.49-2.7-1.08-2.7-1.08-.37-.93-.9-1.18-.9-1.18-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82A7.6 7.6 0 0 1 8 3.73c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.74.54 1.5l-.01 2.31c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/></svg><span>Issues</span></div><div class="header-tools"><button class="scope" role="switch" aria-checked="false" aria-label="Show current repository only"><span>Current repo</span><span class="switch"></span></button><button class="icon-button refresh" title="Refresh" aria-label="Refresh issues"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 5V2.5L11.5 4A5.5 5.5 0 1 0 13.2 9" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="icon-button settings" title="Codexion settings" aria-label="Open Codexion settings"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35"><circle cx="8" cy="8" r="2.1"/><path d="M6.8 2.1h2.4l.45 1.45 1.1.65 1.5-.32 1.2 2.08-1.04 1.1v1.28l1.04 1.1-1.2 2.08-1.5-.32-1.1.65-.45 1.45H6.8l-.45-1.45-1.1-.65-1.5.32-1.2-2.08 1.04-1.1V7.06l-1.04-1.1 1.2-2.08 1.5.32 1.1-.65z" stroke-linejoin="round"/></svg></button></div></div><div class="error" hidden></div><div class="list"></div></section>
    <div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="Codexion settings"><div class="dialog-head"><span class="dialog-title">Codexion · GitHub Issues</span><button class="icon-button close">✕</button></div><div class="dialog-body"><div class="status">Checking GitHub CLI…</div><input class="repo-filter" placeholder="Filter repositories"/><div class="repos"></div></div></section></div>
  \`;
  const trigger = shadow.querySelector(".trigger");
  const badge = shadow.querySelector(".badge");
  const surface = shadow.querySelector(".surface");
  const list = shadow.querySelector(".list");
  const errorBox = shadow.querySelector(".error");
  const backdrop = shadow.querySelector(".dialog-backdrop");
  const repos = shadow.querySelector(".repos");
  const status = shadow.querySelector(".status");
  const filter = shadow.querySelector(".repo-filter");
  let snapshot = null;
  let settingsSnapshot = null;
  let currentScope = false;
  let currentRepository = null;
  let currentRepositoryIssues = [];
  let currentRepositoryState = "idle";
  let currentRepositoryFetchedAt = 0;
  let currentThreadId = null;
  window.__codexionIssueActions = [];
  const queue = (action) => window.__codexionIssueActions.push(action);
  const position = () => {
    const rect = trigger.getBoundingClientRect();
    surface.style.transform = "none";
    surface.style.right = Math.max(8, innerWidth - rect.right) + "px";
    surface.style.top = Math.min(innerHeight - 20, rect.bottom + 7) + "px";
    const placed = surface.getBoundingClientRect();
    const correction = rect.right - placed.right;
    if (Math.abs(correction) > 0.5) surface.style.transform = "translateX(" + correction + "px)";
  };
  const closeMenu = () => { surface.dataset.open = "false"; trigger.setAttribute("aria-expanded", "false"); };
  trigger.onclick = (event) => { event.stopPropagation(); const open = surface.dataset.open !== "true"; surface.dataset.open=String(open); trigger.setAttribute("aria-expanded",String(open)); if(open){position();prefetchCurrentRepository();} };
  shadow.querySelector(".refresh").onclick = () => currentScope?prefetchCurrentRepository(true):queue({type:"refresh"});
  shadow.querySelector(".settings").onclick = () => { closeMenu(); void openCodexionSettings(); };
  shadow.querySelector(".close").onclick = () => backdrop.dataset.open="false";
  backdrop.onclick = (event) => { if(event.target===backdrop) backdrop.dataset.open="false"; };
  let overlayHost = null;
  document.addEventListener("pointerdown", window.__codexionIssueOutside = (event) => { const path=event.composedPath(); if(!path.includes(host) && !path.includes(overlayHost) && surface.dataset.open==="true") closeMenu(); }, true);
  filter.oninput = () => renderSettings();
  const activeThreadId = () => document.querySelector('[data-app-action-sidebar-thread-active="true"]')?.getAttribute("data-app-action-sidebar-thread-id") || null;
  const prefetchCurrentRepository = (force=false) => {
    const threadId=activeThreadId();const sameThread=threadId===currentThreadId;
    if(!threadId){currentThreadId=null;currentRepository=null;currentRepositoryIssues=[];currentRepositoryState="unavailable";if(currentScope)renderIssues();return;}
    if(!force&&sameThread&&(currentRepositoryState==="resolving"||(currentRepositoryState==="ready"&&Date.now()-currentRepositoryFetchedAt<60000)))return;
    currentThreadId=threadId;
    if(!sameThread){currentRepository=null;currentRepositoryIssues=[];currentRepositoryFetchedAt=0;currentRepositoryState="resolving";}else if(currentRepositoryState!=="ready")currentRepositoryState="resolving";
    if(currentScope)renderIssues();
    queue({type:"resolve-current-repo",threadId,force});
  };
  shadow.querySelector(".scope").onclick = (event) => { event.stopPropagation(); currentScope=!currentScope; event.currentTarget.setAttribute("aria-checked",String(currentScope)); if(currentScope)prefetchCurrentRepository();renderIssues(); };
  const renderIssues = () => {
    const allIssues = snapshot?.issues ?? [];
    const issues = currentScope?currentRepositoryIssues:allIssues;
    const maxAgeDays=snapshot?.maxAgeDays??null;
    const cutoff=maxAgeDays===null?null:Date.now()-maxAgeDays*86400000;
    const recentIssues=currentScope&&cutoff!==null?issues.filter(issue=>{const createdAt=Date.parse(issue.createdAt||"");return Number.isFinite(createdAt)&&createdAt>=cutoff;}):issues;
    const olderIssues=currentScope&&cutoff!==null?issues.filter(issue=>!recentIssues.includes(issue)):[];
    badge.textContent = recentIssues.length > 99 ? "99+" : String(recentIssues.length);
    badge.dataset.visible = String(recentIssues.length > 0);
    list.replaceChildren();
    const showEmpty = (message) => { const empty=document.createElement("div");empty.className="empty";empty.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3.5 7.5h6l1.5 2h9.5v8.75a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75z"/><path d="m9 14 2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';empty.querySelector("span").textContent=message;list.append(empty); };
    if (!snapshot) { showEmpty("Loading issues…"); return; }
    if (!snapshot?.github?.installed) { showEmpty("Install GitHub CLI to use Issue Inbox."); return; }
    if (!snapshot?.github?.authenticated) { showEmpty("Run gh auth login to connect GitHub."); return; }
    if (!currentScope&&!(snapshot?.selectedRepositories?.length)) { showEmpty("Choose repositories in Codexion settings."); return; }
    if (currentScope&&currentRepositoryState==="resolving") { showEmpty("Finding the current repository…"); return; }
    if (currentScope&&currentRepositoryState==="unavailable") { showEmpty("This task is not connected to a GitHub repository."); return; }
    if (!recentIssues.length) { const period=maxAgeDays===null?"":" in the last "+maxAgeDays+" days";showEmpty(currentScope&&currentRepository?"No unhandled issues for "+currentRepository+period+".":"No unhandled issues."); }
    const renderIssue = (issue, container=list) => {
      const row=document.createElement("article"); row.className="issue";
      const safeBody=issue.body || "No description provided.";
      row.innerHTML='<div class="meta"></div><span class="age"></span><div class="title"></div><div class="excerpt"></div><div class="actions"><a class="view-link" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.23.49-2.7-1.08-2.7-1.08-.37-.93-.9-1.18-.9-1.18-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82A7.6 7.6 0 0 1 8 3.73c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.74.54 1.5l-.01 2.31c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/></svg><span>View on GitHub</span></a><span class="push"></span><button class="action primary">Handle</button><button class="action">Ignore</button></div>';
      row.querySelector(".meta").textContent=issue.repository+" #"+issue.number+(issue.author?" · "+issue.author:"");
      const createdAt=Date.parse(issue.createdAt||"");const days=Number.isFinite(createdAt)?Math.max(0,Math.floor((Date.now()-createdAt)/86400000)):null;row.querySelector(".age").textContent=days===null?"":days===0?"Today":days+"d";
      row.querySelector(".title").textContent=issue.title;
      row.querySelector(".excerpt").textContent=safeBody;
      row.querySelector(".view-link").href=issue.url;
      const buttons=row.querySelectorAll("button");
      buttons[0].onclick=()=>{ buttons[0].disabled=true; queue({type:"handle",issueId:issue.id}); };
      buttons[1].onclick=()=>queue({type:"ignore",issueId:issue.id});
      container.append(row);
    };
    for (const issue of recentIssues) renderIssue(issue);
    if(olderIssues.length){const older=document.createElement("section");older.className="older";const heading=document.createElement("div");heading.className="older-head";heading.textContent="Older issues · "+olderIssues.length;const olderList=document.createElement("div");older.append(heading,olderList);for(const [index,issue] of olderIssues.entries()){renderIssue(issue,olderList);if(index>=3)olderList.lastElementChild.hidden=true;}if(olderIssues.length>3){const toggle=document.createElement("button");toggle.className="older-toggle";toggle.textContent="Show "+(olderIssues.length-3)+" more";let expanded=false;toggle.onclick=()=>{expanded=!expanded;for(const [index,row] of [...olderList.children].entries())if(index>=3)row.hidden=!expanded;toggle.textContent=expanded?"Show fewer":"Show "+(olderIssues.length-3)+" more";};older.append(toggle);}list.append(older);}
    if (!recentIssues.length&&!olderIssues.length) {
      return;
    }
  };
  const renderSettings = () => {
    if (!settingsSnapshot) return;
    const gh=settingsSnapshot.github;
    status.hidden=gh.authenticated;
    status.textContent=!gh.installed?"GitHub CLI was not found. Install gh and restart Codexion.":"GitHub CLI is not authenticated. Run gh auth login.";
    const query=filter.value.trim().toLowerCase(); repos.replaceChildren();
    const selected=new Set(settingsSnapshot.selectedRepositories || []);
    for(const repo of settingsSnapshot.repositories || []) {
      if(repo.isArchived || !repo.hasIssuesEnabled || !repo.nameWithOwner.toLowerCase().includes(query)) continue;
      const row=document.createElement("div"); row.className="repo";
      const checkbox=document.createElement("input"); checkbox.type="checkbox"; checkbox.value=repo.nameWithOwner; checkbox.checked=selected.has(repo.nameWithOwner);
      checkbox.onchange=()=>{if(checkbox.checked)selected.add(repo.nameWithOwner);else selected.delete(repo.nameWithOwner);settingsSnapshot.selectedRepositories=[...selected];queue({type:"set-repositories",repositories:[...selected]});};
      const label=document.createElement("label"); label.textContent=repo.nameWithOwner; label.onclick=()=>checkbox.click();
      const workspace=document.createElement("span"); workspace.className="workspace"; workspace.textContent=settingsSnapshot.workspaces?.[repo.nameWithOwner] || "No local workspace";
      row.append(checkbox,label,workspace); repos.append(row);
    }
  };
  let nativeButton = null;
  let nativePage = null;
  let nativeOriginal = null;
  let nativeSelection = null;
  let nativePreviousButton = null;
  const closeNativePage = (restorePrevious=true) => {
    if(nativeOriginal) nativeOriginal.style.display="";
    nativePage?.remove(); nativePage=null;
    nativeSelection=null;
    if(nativeButton){nativeButton.removeAttribute("aria-current");nativeButton.classList.remove("bg-token-list-hover-background");}
    if(restorePrevious&&nativePreviousButton?.isConnected){nativePreviousButton.setAttribute("aria-current","page");nativePreviousButton.classList.add("bg-token-list-hover-background");}
    nativePreviousButton=null;
  };
  const handleSettingsNavigation = (event) => {
    const button=event.target instanceof Element?event.target.closest('nav[aria-label="Settings"] button'):null;
    if(button&&button!==nativeButton&&nativePage)closeNativePage(false);
  };
  document.addEventListener("click",handleSettingsNavigation,true);
  const activate = (element) => {
    for(const type of ["pointerdown","mousedown","pointerup","mouseup","click"]){
      const event=type.startsWith("pointer")?new PointerEvent(type,{bubbles:true,button:0,pointerId:1,pointerType:"mouse"}):new MouseEvent(type,{bubbles:true,button:0});element.dispatchEvent(event);
    }
  };
  const waitFor = async (find, attempts=50) => {
    for(let index=0;index<attempts;index++){const value=find();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}
    return null;
  };
  const openCodexionSettings = async () => {
    let button=document.getElementById("codexion-settings-nav");
    if(!button){
      const profile=document.querySelector('button[aria-label="Open profile menu"]');
      if(profile)activate(profile);
      const settingsItem=await waitFor(()=>Array.from(document.querySelectorAll('[role="menuitem"]')).find(element=>element.innerText.startsWith("Settings")));
      if(settingsItem)activate(settingsItem);
      button=await waitFor(()=>document.getElementById("codexion-settings-nav"));
    }
    if(button){button.click();return;}
    backdrop.dataset.open="true";if(!settingsSnapshot)queue({type:"load-settings"});
  };
  const renderNativeSettings = () => {
    if(!nativePage || !settingsSnapshot) return;
    const gh=settingsSnapshot.github;
    const statusElement=nativePage.querySelector("[data-codexion-status]");
    statusElement.hidden=gh.authenticated;
    statusElement.textContent=!gh.installed?"GitHub CLI was not found. Install gh and restart Codexion.":"GitHub CLI is not authenticated. Run gh auth login, then reopen this page.";
    const accountElement=nativePage.querySelector("[data-codexion-account]");
    accountElement.textContent=gh.authenticated&&gh.login?"@"+gh.login:"";
    accountElement.hidden=!gh.authenticated;
    const ageValue=settingsSnapshot.maxAgeDays===null?"all":String(settingsSnapshot.maxAgeDays);
    const ageButton=nativePage.querySelector("[data-codexion-age]");
    const ageLabel=nativePage.querySelector("[data-codexion-age-label]");
    const ageOption=nativePage.querySelector('[data-codexion-age-option="'+ageValue+'"]');
    if(ageLabel)ageLabel.textContent=ageOption?.textContent||"Issue window";
    for(const option of nativePage.querySelectorAll("[data-codexion-age-option]")){const selected=option.dataset.codexionAgeOption===ageValue;option.setAttribute("aria-selected",String(selected));option.tabIndex=selected?0:-1;}
    ageButton?.setAttribute("aria-activedescendant",ageOption?.id||"");
    if(nativeSelection===null) nativeSelection=new Set(settingsSnapshot.selectedRepositories || []);
    const container=nativePage.querySelector("[data-codexion-repos]"); container.replaceChildren();
    const query=(nativePage.querySelector("[data-codexion-filter]")?.value||"").trim().toLowerCase();
    const selected=nativeSelection;
    for(const repo of settingsSnapshot.repositories || []) {
      if(repo.isArchived || !repo.hasIssuesEnabled) continue;
      if(query && !repo.nameWithOwner.toLowerCase().includes(query)) continue;
      const row=document.createElement("label"); row.className="cx-repo";
      const checkbox=document.createElement("input"); checkbox.type="checkbox";checkbox.value=repo.nameWithOwner;checkbox.checked=selected.has(repo.nameWithOwner);
      checkbox.onchange=()=>{if(checkbox.checked)selected.add(repo.nameWithOwner);else selected.delete(repo.nameWithOwner);queue({type:"set-repositories",repositories:[...selected]});};
      const name=document.createElement("span");name.className="cx-name";name.textContent=repo.nameWithOwner;
      const workspace=document.createElement("span");workspace.className="cx-workspace";workspace.textContent=settingsSnapshot.workspaces?.[repo.nameWithOwner]||"No local workspace detected";
      row.append(checkbox,name,workspace);container.append(row);
    }
    const ignoredContainer=nativePage.querySelector("[data-codexion-ignored]");ignoredContainer.replaceChildren();
    const ignoredIssues=settingsSnapshot.ignoredIssues || [];
    nativePage.querySelector("[data-codexion-ignored-empty]").hidden=ignoredIssues.length>0;
    for(const issue of ignoredIssues){
      const row=document.createElement("div");row.className="cx-ignored";row.dataset.issueId=issue.issueId;
      const identity=document.createElement("div");identity.className="cx-ignored-copy";
      const meta=document.createElement("span");meta.className="cx-ignored-meta";meta.textContent=issue.repository+" #"+issue.issueNumber;
      const title=document.createElement("span");title.className="cx-ignored-title";title.textContent=issue.title||"Ignored issue";
      const button=document.createElement("button");button.className="cx-secondary";button.textContent="Unignore";button.onclick=()=>{button.disabled=true;button.textContent="Restoring…";queue({type:"unignore",issueId:issue.issueId});};
      identity.append(meta,title);row.append(identity,button);ignoredContainer.append(row);
    }
  };
  const openNativePage = () => {
    if(nativePage){renderNativeSettings();return;}
    const left=document.querySelector(".app-shell-left-panel"); const main=left?.nextElementSibling;
    if(!main) { backdrop.dataset.open="true"; if(!settingsSnapshot)queue({type:"load-settings"}); return; }
    nativeOriginal=main.firstElementChild; if(nativeOriginal) nativeOriginal.style.display="none";
    nativePage=document.createElement("section");nativePage.id="codexion-settings-page";
    nativePage.innerHTML=\`<style>
      #codexion-settings-page{background:var(--color-token-bg-primary);color:var(--color-token-text-primary);height:100%;overflow:auto;padding:70px 48px 48px}
      #codexion-settings-page .cx-wrap{margin:0 auto;max-width:768px} #codexion-settings-page h1{font-size:24px;font-weight:400;margin:0 0 32px}
      #codexion-settings-page h2{font-size:14px;font-weight:600;margin:0 0 8px} #codexion-settings-page p{color:var(--color-token-text-secondary);font-size:13px;line-height:19px;margin:0 0 16px}
      #codexion-settings-page .cx-section-head{align-items:center;display:flex;gap:8px;margin-bottom:8px} #codexion-settings-page .cx-section-head h2{margin:0} #codexion-settings-page .cx-account{color:var(--color-token-text-secondary);font-size:12px}
      #codexion-settings-page .cx-card{background:var(--color-background-panel,var(--color-token-bg-fog));border:1px solid var(--color-token-border);border-radius:16px;overflow:hidden}
      #codexion-settings-page .cx-option{align-items:center;background:var(--color-background-panel,var(--color-token-bg-fog));border:1px solid var(--color-token-border);border-radius:12px;box-sizing:border-box;display:flex;gap:24px;justify-content:space-between;margin:0 0 24px;min-height:64px;padding:12px 16px} #codexion-settings-page .cx-option-copy{display:flex;flex:1;flex-direction:column;gap:3px;min-width:0} #codexion-settings-page .cx-option-title{font-size:13px;font-weight:600;line-height:18px} #codexion-settings-page .cx-option-description{color:var(--color-token-text-secondary);font-size:11px;line-height:16px}
      #codexion-settings-page .cx-filter-wrap{border-bottom:1px solid var(--color-token-border);padding:10px} #codexion-settings-page .cx-filter-control{position:relative} #codexion-settings-page .cx-filter-control svg{color:var(--color-token-text-tertiary);height:14px;left:11px;pointer-events:none;position:absolute;top:11px;width:14px} #codexion-settings-page .cx-filter{background:var(--color-token-bg-primary);border:1px solid var(--color-token-border);border-radius:8px;box-sizing:border-box;color:inherit;font-size:13px;height:36px;outline:none;padding:0 11px 0 34px;width:100%} #codexion-settings-page .cx-filter:focus{border-color:color-mix(in srgb,currentColor 45%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,currentColor 16%,transparent)} #codexion-settings-page .cx-select{flex:none;position:relative;width:148px} #codexion-settings-page button.cx-age{align-items:center;background:var(--color-token-bg-primary);border:1px solid var(--color-token-border);border-radius:8px;box-sizing:border-box;color:inherit;display:flex;font-size:13px;font-weight:400;height:34px;justify-content:space-between;padding:0 10px 0 12px;width:100%} #codexion-settings-page button.cx-age:focus-visible{border-color:color-mix(in srgb,currentColor 45%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,currentColor 16%,transparent);outline:none} #codexion-settings-page .cx-age svg{color:var(--color-token-text-tertiary);height:14px;transition:transform 100ms ease-out;width:14px} #codexion-settings-page .cx-age[aria-expanded="true"] svg{transform:rotate(180deg)}
      #codexion-settings-page .cx-age-menu{background:var(--color-background-panel,var(--color-token-bg-primary));border:1px solid var(--color-token-border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);display:none;left:0;padding:4px;position:absolute;top:38px;width:100%;z-index:10} #codexion-settings-page .cx-age-menu[data-open="true"]{display:block} #codexion-settings-page button.cx-age-option{align-items:center;background:transparent;border:0;border-radius:5px;color:inherit;display:flex;font-size:13px;font-weight:400;height:30px;padding:0 8px;text-align:left;width:100%} #codexion-settings-page button.cx-age-option:hover,#codexion-settings-page button.cx-age-option:focus-visible{background:var(--color-token-list-hover-background);outline:none} #codexion-settings-page button.cx-age-option[aria-selected="true"]{background:color-mix(in srgb,currentColor 9%,transparent);font-weight:550}
      #codexion-settings-page .cx-status{border-bottom:1px solid var(--color-token-border);font-size:13px;padding:14px 16px}
      #codexion-settings-page .cx-repos{max-height:420px;overflow:auto} #codexion-settings-page .cx-repo{align-items:center;cursor:pointer;display:grid;gap:10px;grid-template-columns:18px minmax(160px,1fr) minmax(160px,1fr);min-height:44px;padding:0 16px}
      #codexion-settings-page .cx-repo:not(:last-child){border-bottom:1px solid var(--color-token-border)} #codexion-settings-page .cx-repo:hover{background:var(--color-token-list-hover-background)}
      #codexion-settings-page .cx-name{font-size:13px} #codexion-settings-page .cx-workspace{color:var(--color-token-text-secondary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #codexion-settings-page button{background:var(--color-token-text-primary);border:0;border-radius:7px;color:var(--color-token-bg-primary);cursor:pointer;font-size:13px;height:34px;padding:0 14px} #codexion-settings-page button:disabled{cursor:default;opacity:.45}
      #codexion-settings-page .cx-ignored-section{margin-top:36px} #codexion-settings-page .cx-ignored{align-items:center;display:flex;gap:16px;min-height:52px;padding:0 16px} #codexion-settings-page .cx-ignored:not(:last-child){border-bottom:1px solid var(--color-token-border)}
      #codexion-settings-page .cx-ignored-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:2px} #codexion-settings-page .cx-ignored-meta{color:var(--color-token-text-secondary);font-size:11px} #codexion-settings-page .cx-ignored-title{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #codexion-settings-page button.cx-secondary{background:transparent;border:1px solid var(--color-token-border);color:inherit;height:28px} #codexion-settings-page .cx-ignored-empty{color:var(--color-token-text-secondary);font-size:13px;padding:18px 16px}
      #codexion-settings-page .cx-version{color:var(--color-token-text-tertiary);font-size:11px;margin-top:32px;text-align:center}
    </style><div class="cx-wrap"><h1>Codexion</h1><div class="cx-section-head"><h2>GitHub Issue Inbox</h2><span class="cx-account" data-codexion-account hidden></span></div><p>Select the repositories Codexion should poll. Issues you authored or already replied to are excluded. Handling an issue starts one idempotent Codex task in the matching local workspace.</p><div class="cx-option"><div class="cx-option-copy"><span class="cx-option-title">Issue window</span><span class="cx-option-description">Controls the recent issues shown in the Inbox and its badge.</span></div><div class="cx-select"><button class="cx-age" data-codexion-age aria-label="Issue window" aria-haspopup="listbox" aria-expanded="false"><span data-codexion-age-label>Last 3 days</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="cx-age-menu" data-codexion-age-menu role="listbox" aria-label="Issue window"><button id="codexion-age-3" class="cx-age-option" data-codexion-age-option="3" role="option">Last 3 days</button><button id="codexion-age-7" class="cx-age-option" data-codexion-age-option="7" role="option">Last 7 days</button><button id="codexion-age-14" class="cx-age-option" data-codexion-age-option="14" role="option">Last 14 days</button><button id="codexion-age-30" class="cx-age-option" data-codexion-age-option="30" role="option">Last 30 days</button><button id="codexion-age-all" class="cx-age-option" data-codexion-age-option="all" role="option">All open issues</button></div></div></div><div class="cx-card"><div class="cx-filter-wrap"><div class="cx-filter-control"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.25"/><path d="m10.25 10.25 3 3" stroke-linecap="round"/></svg><input class="cx-filter" data-codexion-filter aria-label="Filter repositories" placeholder="Filter repositories"/></div></div><div class="cx-status" data-codexion-status>Checking GitHub CLI…</div><div class="cx-repos" data-codexion-repos></div></div><section class="cx-ignored-section"><h2>Ignored Issues</h2><p>Issues hidden from the Inbox on this Mac.</p><div class="cx-card"><div class="cx-ignored-empty" data-codexion-ignored-empty>No ignored issues.</div><div data-codexion-ignored></div></div></section><div class="cx-version" data-codexion-version></div></div>\`;
    main.append(nativePage);
    nativePage.querySelector("[data-codexion-version]").textContent="Codexion "+codexionVersion;
    nativePage.querySelector("[data-codexion-filter]").oninput=()=>renderNativeSettings();
    const ageButton=nativePage.querySelector("[data-codexion-age]");const ageMenu=nativePage.querySelector("[data-codexion-age-menu]");
    const closeAgeMenu=(focus=false)=>{ageMenu.dataset.open="false";ageButton.setAttribute("aria-expanded","false");if(focus)ageButton.focus();};
    ageButton.onclick=()=>{const open=ageMenu.dataset.open!=="true";ageMenu.dataset.open=String(open);ageButton.setAttribute("aria-expanded",String(open));if(open)(ageMenu.querySelector('[aria-selected="true"]')||ageMenu.firstElementChild)?.focus();};
    ageButton.onkeydown=(event)=>{if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();ageMenu.dataset.open="true";ageButton.setAttribute("aria-expanded","true");(ageMenu.querySelector('[aria-selected="true"]')||ageMenu.firstElementChild)?.focus();}};
    for(const option of ageMenu.querySelectorAll("[data-codexion-age-option]")){option.onclick=()=>{const value=option.dataset.codexionAgeOption;closeAgeMenu(true);queue({type:"set-max-age",maxAgeDays:value==="all"?null:Number(value)});};option.onkeydown=(event)=>{const options=[...ageMenu.querySelectorAll("[data-codexion-age-option]")];const index=options.indexOf(option);if(event.key==="Escape"){event.preventDefault();closeAgeMenu(true);}else if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();options[(index+(event.key==="ArrowDown"?1:-1)+options.length)%options.length].focus();}};}
    nativePage.addEventListener("pointerdown",event=>{if(!event.target.closest(".cx-select"))closeAgeMenu();});
    const settingsButtons=[...document.querySelectorAll('nav[aria-label="Settings"] button')];
    nativePreviousButton=settingsButtons.find(button=>button!==nativeButton&&(button.getAttribute("aria-current")==="page"||button.classList.contains("bg-token-list-hover-background")))||null;
    for(const button of settingsButtons){if(button===nativeButton)continue;button.removeAttribute("aria-current");button.classList.remove("bg-token-list-hover-background");}
    nativeButton?.setAttribute("aria-current","page"); nativeButton?.classList.add("bg-token-list-hover-background");
    if(!settingsSnapshot)queue({type:"load-settings"});renderNativeSettings();
  };
  window.__codexionUpdateIssueInbox = (next, isSettings=false) => { if(isSettings){settingsSnapshot=next; renderSettings(); renderNativeSettings();} else {snapshot=next; renderIssues();} errorBox.hidden=true; };
  window.__codexionIssueUnignored = (issueId) => {
    if(settingsSnapshot)settingsSnapshot.ignoredIssues=(settingsSnapshot.ignoredIssues||[]).filter(issue=>issue.issueId!==issueId);
    renderNativeSettings();
  };
  window.__codexionSetCurrentRepository = (threadId, repository, issues=[]) => { if(threadId!==currentThreadId)return;currentRepository=repository||null;currentRepositoryIssues=Array.isArray(issues)?issues:[];currentRepositoryFetchedAt=Date.now();currentRepositoryState=repository?"ready":"unavailable";if(currentScope)renderIssues(); };
  window.__codexionIssueError = (message) => {
    errorBox.textContent=message; errorBox.hidden=false; renderIssues();
    if(nativePage){const statusElement=nativePage.querySelector("[data-codexion-status]");statusElement.hidden=false;statusElement.textContent=message;}
  };
  window.__codexionDrainIssueActions = () => window.__codexionIssueActions.splice(0);
  overlayHost=document.createElement("span");overlayHost.id="codexion-issue-inbox-overlay";overlayHost.style.inset="0";overlayHost.style.pointerEvents="none";overlayHost.style.position="fixed";overlayHost.style.zIndex="2147483646";
  const overlayShadow=overlayHost.attachShadow({mode:"open"});overlayShadow.append(shadow.querySelector("style").cloneNode(true),surface,backdrop);surface.style.pointerEvents="auto";backdrop.style.pointerEvents="auto";document.body.append(overlayHost);
  const place = () => {
    const labels=["Toggle pinned summary","Toggle bottom panel","Toggle side panel"];
    const candidates=labels.flatMap(label=>Array.from(document.querySelectorAll('button[aria-label="'+label+'"]')));
    const anchor=candidates.find(button=>{const rect=button.getBoundingClientRect();return rect.width>0&&rect.height>0&&rect.x>window.innerWidth/2;})||candidates[0];
    const anchorWrapper=anchor?.parentElement;
    const group=anchorWrapper?.classList?.contains("contents")?anchorWrapper.parentElement:anchorWrapper;
    if(group){const meterHost=document.getElementById("codexion-sanity-meter-host");const reference=meterHost?.parentElement===group?meterHost.nextSibling:group.firstChild;if(host!==reference)group.insertBefore(host,reference);}
    const integrationTitle=Array.from(document.querySelectorAll("nav *")).find(e=>e.children.length===0&&e.textContent.trim()==="Integrations");
    const integrationList=integrationTitle?.parentElement?.nextElementSibling;
    if(integrationList && !document.getElementById("codexion-settings-nav")) {
      const template=integrationList.querySelector("button");
      if(template){
        nativeButton=template.cloneNode(true);nativeButton.id="codexion-settings-nav";nativeButton.removeAttribute("data-settings-panel-slug");nativeButton.removeAttribute("aria-current");nativeButton.classList.remove("bg-token-list-hover-background");nativeButton.setAttribute("aria-label","Codexion");
        const label=nativeButton.querySelector(".text-fade-truncate");if(label)label.textContent="Codexion";
        const icon=nativeButton.querySelector("svg");if(icon)icon.outerHTML='<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="icon-sm" style="height:16px;width:16px" aria-hidden="true"><path d="M13 2.75H6.25C4.15 2.75 2.75 4.2 2.75 6.3v3.4c0 2.1 1.4 3.55 3.5 3.55H13" stroke-width="1.5"/><path d="M11 6H7.5C6.55 6 6 6.75 6 8s.55 2 1.5 2H11" stroke-width="1.25"/></svg>';
        nativeButton.onclick=(event)=>{event.preventDefault();event.stopPropagation();openNativePage();};integrationList.append(nativeButton);
      }
    }
    if(nativePage && !document.getElementById("codexion-settings-nav")) closeNativePage();
    const threadId=activeThreadId();if(threadId!==currentThreadId)prefetchCurrentRepository();
  };
  place(); const observer=new MutationObserver(place); observer.observe(document.body,{attributes:true,attributeFilter:["data-app-action-sidebar-thread-active"],childList:true,subtree:true});
  window.__codexionIssueInboxCleanup=()=>{observer.disconnect();document.removeEventListener("pointerdown",window.__codexionIssueOutside,true);document.removeEventListener("click",handleSettingsNavigation,true);closeNativePage();nativeButton?.remove();host.remove();overlayHost?.remove();};
  return true;
})()`;

export function createIssueInboxUpdateExpression(
  snapshot: IssueInboxSnapshot,
  settings = false,
): string {
  return `window.__codexionUpdateIssueInbox?.(${JSON.stringify(snapshot)}, ${String(settings)}); true;`;
}

export function createIssueInboxErrorExpression(message: string): string {
  return `window.__codexionIssueError?.(${JSON.stringify(message)}); true;`;
}

export const DRAIN_ISSUE_ACTIONS_EXPRESSION = "window.__codexionDrainIssueActions?.() ?? []";
