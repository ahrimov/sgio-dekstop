import { useState, useRef, useCallback } from 'react';
import { Draw, Modify } from 'ol/interaction';
import Collection from 'ol/Collection.js';

export function useDrawGeometry({ map }) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [isModifying, setIsModifying] = useState(false);
    const [currentGeometry, setCurrentGeometry] = useState(null);
    const [showUndoButton, setShowUndoButton] = useState(false);
    const [acceptButtonDisabled, setAcceptButtonDisabled] = useState(true);
    const [canReset, setCanReset] = useState(false);
    const currentFeatureRef = useRef(null);
    const currentLayerRef = useRef(null);

    const drawInteractionRef = useRef(null);
    const modifyInteractionRef = useRef(null);
    const snapInteractionRef = useRef(null);

    const startModifying = useCallback(
        (feature) => {
            if (!map) return;

            clearInteractions();
            const modify = new Modify({
                features: new Collection([feature]),
            });

            map.addInteraction(modify);
            modifyInteractionRef.current = modify;

            setIsModifying(true);
        },
        [map]
    );

    const startDrawing = useCallback(
        (layer) => {
            if (!map) return;
            const source = layer.getSource();
            const geometryType = convertGeometryType(layer.geometryType);

            clearInteractions();

            const draw = new Draw({ source, type: geometryType, stopClick: true });

            draw.set('layer', layer);

            draw.on('drawstart', (event) => {
                const currentLayer = draw.get('layer');
                if (typeof draw.currentFeature != 'undefined') {
                    currentLayer.getSource().removeFeature(draw.currentFeature);
                }
                draw.currentFeature = event.feature;
                currentFeatureRef.current = event.feature;

                setShowUndoButton(true);
                setAcceptButtonDisabled(false);
                setCanReset(true);
            });

            draw.on('drawend', () => {
                setShowUndoButton(false);
                setCanReset(true);

                startModifying(draw.currentFeature);
            });

            draw.on('drawabort', () => {
                setShowUndoButton(false);
                setCanReset(true);
                setAcceptButtonDisabled(true);
            });

            setAcceptButtonDisabled(true);

            map.addInteraction(draw);
            drawInteractionRef.current = draw;

            setIsDrawing(true);
            setIsModifying(false);
            setCurrentGeometry({ type: geometryType, coordinates: [] });
            currentLayerRef.current = layer;
        },
        [map, startModifying]
    );

    const undo = useCallback(() => {
        if (!drawInteractionRef.current) {
            return;
        }

        try {
            drawInteractionRef.current.removeLastPoint();
            
            if (currentFeatureRef.current) {
                const geometry = currentFeatureRef.current.getGeometry();
                if (geometry && geometry.getCoordinates().length === 0) {
                    setShowUndoButton(false);
                    setCanReset(false);
                    setAcceptButtonDisabled(false);
                }
            }
        } catch (error) {
            console.error('Error removing last point:', error);
        }
    }, []);

    const rejectCurrentFeature = useCallback(() => {
        if (!currentFeatureRef.current || !currentLayerRef.current) {
            return;
        }

        try {
            if (drawInteractionRef.current) {
                drawInteractionRef.current.abortDrawing();
            }
            if (modifyInteractionRef.current) {
                map.removeInteraction(modifyInteractionRef.current);
                modifyInteractionRef.current = null;
            }
            const source = currentLayerRef.current.getSource();
            source.removeFeature(currentFeatureRef.current);
            
            currentFeatureRef.current = null;
            if (drawInteractionRef.current?.currentFeature) {
                drawInteractionRef.current.currentFeature = null;
            }
            
            setShowUndoButton(false);
            setAcceptButtonDisabled(true);
            setCurrentGeometry(null);
            setCanReset(false);
            
            if (!drawInteractionRef.current) {
                startDrawing(currentLayerRef.current);
            }
            
        } catch (error) {
            console.error('Error rejecting feature:', error);
        }
    }, [map, startDrawing]);

    const clearInteractions = useCallback(() => {
        if (drawInteractionRef.current) {
            map.removeInteraction(drawInteractionRef.current);
            drawInteractionRef.current = null;
        }
        if (modifyInteractionRef.current) {
            map.removeInteraction(modifyInteractionRef.current);
            modifyInteractionRef.current = null;
        }
        if (snapInteractionRef.current) {
            map.removeInteraction(snapInteractionRef.current);
            snapInteractionRef.current = null;
        }
    }, [map]);

    const reset = useCallback(() => {
        if (drawInteractionRef.current) {
            drawInteractionRef.current.abortDrawing();
        }
        
        setCurrentGeometry(null);
        currentFeatureRef.current = null;
        clearInteractions();
        setIsDrawing(false);
        setIsModifying(false);
        setShowUndoButton(false);
        setAcceptButtonDisabled(true);
        currentLayerRef.current = null;

    }, [clearInteractions]);


    const finishEditing = useCallback(() => {
        if (!currentFeatureRef.current) return;
        
        setIsDrawing(false);
        setIsModifying(false);
        clearInteractions();
        
        return currentFeatureRef.current;
    }, [currentGeometry, clearInteractions]);



  return {
    isDrawing,
    isModifying,
    currentGeometry,
    showUndoButton,           
    acceptButtonDisabled,
    canReset, 

    startDrawing,
    startModifying,
    undo,
    reset,
    finishEditing, 
    rejectCurrentFeature,  
  };
}


function convertGeometryType(type){
    switch(type){
        case 'MULTIPOINT':
            return 'MultiPoint'
        case 'MULTIPOLYGON':
            return 'MultiPolygon'
        case 'MULTILINESTRING':
            return 'MultiLineString'
        default:
            return type;
    }
}

