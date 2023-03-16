import { FlowDisplayColumn, FlowObjectData, FlowObjectDataArray } from "flow-component-model";
import { oDataRow } from "./oDataRow";
import { oDataTreeNode } from "./oDataTreeNode";

// class to pass the data interpretation parameters to the underlying model
export class oDataConfig {
    // the last display column's developer name
    lastTreeColumn: string;
    
    // if the data is being delivered as a JSON string, this is the Flow value name containing it. 
    stringModelFieldName: string;

    // a copy of the component's configured display columns
    displayColumns: FlowDisplayColumn[];
}

// this class represents the data model.  It has the methods to parse, query and present the data for rendering
export class oData {
    
    config: oDataConfig;

    //the hierarchical tree, contains the label and id of node in treeNodes
    tree: Map<string,string>;

    //flat map of all nodes
    treeNodes: Map<string,oDataTreeNode>;
    
    // every row of data keyed on row id
    rows: Map<string,oDataRow>

    // unused but needed to overlap oDataTree
    dataRowId: string;
    carriesData: boolean;

    dataGridColumns: FlowDisplayColumn[];
    
    constructor(conf: oDataConfig) {
        this.config = conf;
        this.rows = new Map();
        this.tree = new Map();
        this.treeNodes = new Map();
        this.dataGridColumns = [];
        let inData: boolean = false;
        conf.displayColumns.forEach((col: FlowDisplayColumn) => {
            if(inData){
                this.dataGridColumns.push(col);
            }
            else {
                if(col.developerName===conf.lastTreeColumn) {
                    inData = true;
                }
            }
        });
    }

    public static parseString(data: string, conf: oDataConfig) : oData {
        let odata: oData = new oData(conf);
        let json: any[] = JSON.parse(data);
        if(json && json.length > 0){
            json.forEach((item: any) => {
                let row: oDataRow = oDataRow.parseObject(item, odata.config);
                odata.rows.set(row.id, row);
            });
        }
        return odata;
    }

    public static parseObjectDataArray(data: FlowObjectDataArray, conf: oDataConfig) : oData {
        let odata: oData = new oData(conf);
        if(data && data.items.length > 0){
            data.items.forEach((item: FlowObjectData) => {
                let row: oDataRow = oDataRow.parseObjectData(item, odata.config);
                odata.ingestRow(row);
                /*
                odata.rows.set(row.id, row);
                let node: oData | oDataTreeNode = odata;
                row.tree.forEach((treeNode: string) => {
                    if(!node.tree.has(treeNode)){
                        let newNode : oDataTreeNode = new oDataTreeNode(treeNode,node);
                        odata.treeNodes.set(newNode.id,newNode);
                        node.tree.set(treeNode, newNode.id);
                        node = newNode;
                    }
                    else {
                        node = odata.treeNodes.get(node.tree.get(treeNode));
                    }
                    
                });
                // node now has lowest level in it, add the row
                node.dataRowId = row.id;
                */
            });
        }
        return odata;
    }

    private ingestRow(row: oDataRow) {
        this.rows.set(row.id, row);
        let node: oData | oDataTreeNode = this;
        let rowId: string="";
        row.tree.forEach((treeNode: string) => {
            if(rowId.length > 0) {
                rowId += "^^";
            }
            rowId += treeNode;
            if(!node.tree.has(treeNode)){
                let newNode : oDataTreeNode = new oDataTreeNode(treeNode,node);
                this.treeNodes.set(newNode.id,newNode);
                node.tree.set(treeNode, newNode.id);
                node = newNode;
                node.dataRowId = row.id;
                node.dataRowKey = rowId;
                node.carriesData = false;
            }
            else {
                node = this.treeNodes.get(node.tree.get(treeNode));
            }
            
        });
        // node now has lowest level in it, add the row
        node.dataRowId = row.id;
        node.carriesData = true;
    }

    getRollupRow(key: string ) : oDataRow {
        let node: oDataTreeNode = this.treeNodes.get(key);
        return node.getRollupRow(this.treeNodes, this.rows,this.dataGridColumns);
    }

    makeObjectData(rowId: string, developerName: string) : FlowObjectData {
        return this.rows.get(rowId).makeObjectData(developerName,this.config);
    }
}

