function createModalSelect(dict, element_id, selected=null, hasSearch=true){
    let element = document.getElementById(element_id);
    element.disabled = true;
    element.disabled = false;
    ons.createElement('modalSelect.html', {append: true})
        .then(function(dialog){
            let content = document.getElementById('select-list');
            showList(dict, content, selected);
            dialog.onDeviceBackButton = () => { hideDialog('modal-select') }

            if (hasSearch) {
                const searchContainer = document.getElementById('select-search-container');
                const searchInput = document.createElement('ons-list-item');
                searchInput.className = 'select-search';
                searchInput.innerHTML = `
                    <ons-input id="select-search" placeholder="Поиск"></ons-input>
                `;
                searchContainer.appendChild(searchInput);

                const input = document.getElementById('select-search');
                input.oninput = function() {
                    content.innerHTML = '';
                    showList(dict, content, selected, input.value);
                };
            }
 
            dialog.show();
        })
    
    function showList(dict, content, selected, filter=null){
        for(let key in dict){
            if(filter !== null && dict[key].search(filter) === -1) continue;
            let item = ons._util.createElement("<ons-list-item tappable></ons-list-item>");
            item.innerHTML = dict[key];
            if(selected != null && selected == key)
                item.innerHTML += `<ons-icon class='icon' icon="md-check" class="modal-select-check"></ons-icon>`;
            item.addEventListener("click", () => returnSelectedValue(key, element_id), false);
            content.appendChild(item);
        }
    }
}

function returnSelectedValue(key, element_id){
    const selectElement = document.getElementById(element_id);
    selectElement.value = key;
    hideDialog('modal-select');

    const event = new Event('change', { bubbles: true });
    selectElement.dispatchEvent(event);
}

function callModalSelectWithLayerAtribs(layer_id, atribName, element_id){
    let layer = findLayer(layer_id);
    let selected = document.getElementById(element_id).value;
    let atrib = getAtribByName(layer.atribs, atribName);
    createModalSelect(atrib.options, element_id, selected);
}

function simpleCreateModalSelect(element_id){
    let select = document.getElementById(element_id);
    let selected_value = select.value;
    let options = {};
    for(let option of select.options){
        let value = option.value;
        let text = option.text;
        options[value] = text;
    }
    createModalSelect(options, element_id, selected_value);
}
