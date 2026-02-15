export function filterSystemProperties(atribs, config) {
    if (config.showSystemProperties) return atribs;
    
    return atribs.filter(atrib => atrib.name !== 'id' && atrib.name !== 'lg_attach');
}