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

    getRollupRow(tree: Map<string,oDataTreeNode>,rows: Map<string,oDataRow>,cols: FlowDisplayColumn[]) : oDataRow {
        let row: oDataRow = new oDataRow();
        this.tree.forEach((child: string) => {
            let node: oDataTreeNode = tree.get(child);
            let childRow: oDataRow = node.getRollupRow(tree, rows, cols);
            cols.forEach((col: FlowDisplayColumn) => {
                if(!row.cols.has(col.developerName)) {
                    row.cols.set(col.developerName,childRow.cols.get(col.developerName));
                }
                else {
                    let val: any;
                    let childVal: any;
                    switch(col.contentType){
                        case eContentType.ContentNumber:
                            val = parseFloat(row.cols.get(col.developerName) || "0");
                            childVal = parseFloat(childRow.cols.get(col.developerName) || "0");
                            break;
                        default:
                            val = row.cols.get(col.developerName) || "";
                            childVal = childRow.cols.get(col.developerName) || "";
                            break;
                    }
                    val += childVal;
                    row.cols.set(col.developerName,val);
                }
            })
        });
        let tRow: oDataRow = rows.get(this.dataRowId);
        if(this.dataRowId && this.carriesData && tRow.include){
            
            cols.forEach((col: FlowDisplayColumn) => {
                if(!row.cols.has(col.developerName)) {
                    row.cols.set(col.developerName,tRow.cols.get(col.developerName));
                }
                else {
                    let val: any;
                    let childVal: any;
                    switch(col.contentType){
                        case eContentType.ContentNumber:
                            val = parseFloat(row.cols.get(col.developerName) || "0");
                            childVal = parseFloat(tRow.cols.get(col.developerName) || "0");
                            break;
                        default:
                            val = row.cols.get(col.developerName) || "";
                            childVal = tRow.cols.get(col.developerName) || "";
                            break;
                    }
                    val += childVal;
                    row.cols.set(col.developerName,val);
                }
            });
        }
        
        return row;
    }
}