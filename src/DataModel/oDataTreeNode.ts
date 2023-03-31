import { eContentType, FlowDisplayColumn } from "flow-component-model";
import { oData, oDataConfig } from "./oData";
import { oDataRow } from "./oDataRow";

// this is the simple representation of a tree node
export class oDataTreeNode {
    // unique id
    id: string;

    // child elements
    tree: Map<string,string>;

    // ref to the node's parent
    parent: oData | oDataTreeNode;

    // the label of the node
    label: string;

    // the child row key
    dataRowId: string;

    //flag to say it carries data
    carriesData: boolean;

    //the row's key, part of the dataRowId
    dataRowKey: string

    constructor(label: string, parent: oData | oDataTreeNode) {
        this.tree = new Map();
        this.id = crypto.randomUUID();
        this.label = label;
        this.parent = parent;
        this.dataRowId = "";
    }

    getRollupRow(oData: oData,cols: FlowDisplayColumn[]) : oDataRow {
        let row: oDataRow = new oDataRow();
        let val: any;
        let childVal: any;
        cols.forEach((col: FlowDisplayColumn) => {
            switch(col.contentType){
                case eContentType.ContentNumber:
                    val = 0;
                    val = Number(val.toFixed(2));
                    break;
                default:
                    val = "";
                    break;
            }
            row.all.set(col.developerName, val);
        });
        
        //recurse into any child nodes
        this.tree.forEach((child: string) => {
            let node: oDataTreeNode = oData.treeNodes.get(child);
            let cRow: oDataRow = oData.rows.get(node.dataRowId);
            if(node){
                let childRow: oDataRow = node.getRollupRow(oData, cols);
                // blend in the child's emitted data
                cols.forEach((col: FlowDisplayColumn) => {
                    if(!row.all.has(col.developerName)) {
                        switch(col.contentType){
                            case eContentType.ContentNumber:
                                val = parseFloat(childRow.all.get(col.developerName) || "0");
                                val = Number(val.toFixed(2));
                                break;
                            default:
                                val = childRow.all.get(col.developerName) || "";
                                break;
                        }
                        row.all.set(col.developerName, val);
                    }
                    else {
                        
                        switch(col.contentType){
                            case eContentType.ContentNumber:
                                val = parseFloat(row.all.get(col.developerName) || "0");
                                childVal = parseFloat(childRow.all.get(col.developerName) || "0");
                                val += childVal;
                                val = Number(val.toFixed(2));
                                break;
                            default:
                                val = row.all.get(col.developerName) || "";
                                childVal = childRow.all.get(col.developerName) || "";
                                val += childVal;
                                break;
                        }
                        row.all.set(col.developerName,val);
                    }
                });
            }
            
        });

        // now loop over any data rows for this node key
        oData.rowKeys.get(this.dataRowKey)?.forEach((rowId: string) => {
            let tRow: oDataRow = oData.rows.get(rowId);  
            if(tRow && this.carriesData && tRow.include){
            
                cols.forEach((col: FlowDisplayColumn) => {
                    if(!row.all.has(col.developerName)) {
                        switch(col.contentType){
                            case eContentType.ContentNumber:
                                val = parseFloat(tRow.all.get(col.developerName) || "0");
                                val = Number(val.toFixed(2));
                                break;
                            default:
                                val = tRow.all.get(col.developerName) || "";
                                break;
                        }
                        row.all.set(col.developerName, val);
                    }
                    else {
                        
                        switch(col.contentType){
                            case eContentType.ContentNumber:
                                val = parseFloat(row.all.get(col.developerName) || "0");
                                childVal = parseFloat(tRow.all.get(col.developerName) || "0");
                                val += childVal;
                                val = Number(val.toFixed(2));
                                break;
                            default:
                                val = row.all.get(col.developerName) || "";
                                childVal = tRow.all.get(col.developerName) || "";
                                val += childVal;
                                break;
                        }
                        row.all.set(col.developerName,val);
                    }
                });
            }
        });       
        
        return row;
    }
}