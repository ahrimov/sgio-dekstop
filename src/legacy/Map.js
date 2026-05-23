export class LayerAtribs{
    constructor(name, label, type, visible = true, options = null, width = null){
        this.name = name;
        this.label = label;
        this.type = type;
        this.options = options;
        this.visible = visible;
        this.width = width;
    }
}