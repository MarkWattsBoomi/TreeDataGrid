import { FlowDisplayColumn, FlowObjectData, FlowObjectDataProperty } from "flow-component-model";
import { oDataConfig } from "./oData";

export class oDataRow {

    id: string;
    tree: Map<string,any>;
    cols: Map<string,any>;

    constructor() {
        this.id=crypto.randomUUID();   
        this.tree = new Map();
        this.cols = new Map();
    }

    // parses a generic JSON object
    public static parseObject(obj: any, conf: oDataConfig) : oDataRow {
        let row: oDataRow = new oDataRow();

        return row;
    }

    // parses a FlowObjectData object
    public static parseObjectData(obj: FlowObjectData, conf: oDataConfig) : oDataRow {
        let row: oDataRow = new oDataRow();
        // flag to say we are reading tree attributes, will flip to false when we see the "lastTreeField" one
        let inTree: boolean = true;
        let key: string="";
        conf.displayColumns?.forEach((col: FlowDisplayColumn) => {
            if(inTree) {
                // we are extracting tree node values
                row.tree.set(col.developerName, obj.properties[col.developerName]?.value);
                if(key.length>0) {
                    key=key + "^^";
                }
                key = key + obj.properties[col.developerName]?.value;

                if(col.developerName===conf.lastTreeColumn) {
                    inTree=false;
                }
            }
            else {
                row.cols.set(col.developerName, obj.properties[col.developerName]?.value)
            }
        });
        row.id = key;

        return row;
    }

    makeObjectData(developerName: string, conf: oDataConfig) : FlowObjectData {
        let objData: FlowObjectData = FlowObjectData.newInstance(developerName);
        let allCols: Map<string,any> = new Map([...this.tree, ...this.cols]);
        conf.displayColumns.forEach((col: FlowDisplayColumn) => {
            objData.addProperty(FlowObjectDataProperty.newInstance(col.developerName, col.contentType, allCols.get(col.developerName)));
        });
        return objData;
    }
}