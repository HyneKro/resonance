export function paintListeningMode(mode){
 const active=['visualizer','constellation','music'].includes(mode)?mode:'visualizer';
 document.body.dataset.listeningMode=active;
 for(const button of document.querySelectorAll('[data-listening-mode]'))button.setAttribute('aria-pressed',String(button.dataset.listeningMode===active));
 return active;
}
