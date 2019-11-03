/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var DATABASE = process.env.DB;
var ObjectId = require('mongodb').ObjectId;

module.exports = function (app,db) {
  
  app.route('/api/threads/:board')
  .post((req,res)=>{
    var board = req.params.board;
    var details = {};
    details.created_on = new Date();
    details.bumped_on = new Date();
    details.reported = false;
    details.replies = [];
    details.text = req.body.text;
    details.delete_password = req.body.delete_password;

    MongoClient.connect(DATABASE,(err,db)=>{
      db.collection(board).insert(details,(err,doc)=>{
        res.redirect('/b/'+board +'/');
      });
    });
    
    
  })
  .get((req,res)=>{
      var board = req.params.board;
      MongoClient.connect(DATABASE,(err,db)=>{
        db.collection(board).find({}).sort({bumped_on: -1}).limit(10).toArray((err,docs)=>{
          if(err)
            console.log(err);
          
          docs = docs.map((obj)=> {
            var replyCount = obj.replies.length;
            var maxCommentLength = obj.replies.length -4;
            var dispComments = obj.replies.map((comm)=>{
              delete comm.delete_password;
              delete comm.reported;
              return comm
            });
            //dispComments = recentThree(...dispComments);
            delete obj.delete_password;
            delete obj.reported;
            obj.replies = recentThree(dispComments);
            obj.replyCount = replyCount;
            return obj;
          });
          res.json(docs);
        });
      });
    })
  .delete((req,res)=>{
    var board = req.params.board;
    
    MongoClient.connect(DATABASE,(err,db)=>{
      db.collection(board).deleteOne({
        _id: new ObjectId(req.body.thread_id),
        delete_password: req.body.delete_password
      }
      ,(err,doc)=>{
        if(err)
          console.log(err);
        
        if(doc.deletedCount == 1)
          res.send('success');
        else
          res.send('incorrect password');
      });
    });
  })
  .put((req,res)=>{
    var board = req.params.board;
    var threadId = req.body.thread_id;
    MongoClient.connect(DATABASE,(err,db)=>{
      db.collection(board).findOneAndUpdate(
      {_id: new ObjectId(threadId)},
      {$set:{reported: true}},
      (err,doc)=>{
        if(err)
          console.log(err);
        console.log(doc);
        if(doc.value)
          res.send('success');
        else
          res.send('reported');
      }
      )
    });
  });
    
  app.route('/api/replies/:board')
  .post((req,res)=>{
    var board = req.params.board;
    var threadId = req.body.thread_id;
    var text = req.body.text;

    var reply = {_id: new ObjectId(),text: text,created_on: new Date(),reported:false,delete_password: req.body.delete_password}
    MongoClient.connect(DATABASE,(err,db)=>{
      db.collection(board).findOneAndUpdate(
      {_id: new ObjectId(threadId)},
      {$set:{bumped_on: new Date()},$push:{replies:reply}},
      (err,doc)=>{if(err) console.log(err)}
      );
    });
    res.redirect('/b/'+board+'/'+req.body.thread_id);
  })
  .get((req,res)=>{
    var board = req.params.board;
    var threadId= req.query.thread_id;

    MongoClient.connect(DATABASE,(err,db)=>{
      db.collection(board).findOne({_id: new ObjectId(threadId)},(err,doc)=>{
        if(err)
          console.log(err);
        if(doc){
          console.log(doc);
        delete doc.delete_password;
        delete doc.reported;
        doc.replies = doc.replies.map((obj)=>{
          delete obj.delete_password;
          delete obj.reported;
          return obj;
        });
        
        }
        
        res.json(doc);
      });
    });
  })
.delete((req,res)=>{
  var board = req.params.board;
  var threadId=req.body.thread_id;
  var replyId = req.body.reply_id;
  
  MongoClient.connect(DATABASE,(err,db)=>{
    db.collection(board).findOneAndUpdate(
    {_id: new ObjectId(threadId),
     replies: {$elemMatch:{_id:new ObjectId(replyId),delete_password:req.body.delete_password}}
    },
    {$set:{'replies.$.text':'[deleted]'}},
    (err,doc)=>{
      if(err)
        console.log(err);
      console.log(doc);
      if(doc.value)
        res.send('success');
      else
        res.send('incorrect password');
    }
    );
  });
    
})
.put((req,res)=>{
    var board = req.params.board;
    var threadId = req.body.thread_id;
    var replyId = req.body.reply_id;
    MongoClient.connect(DATABASE,(err,db)=>{
      db.collection(board).findOneAndUpdate(
      {
        _id: new ObjectId(threadId),
        replies: {$elemMatch:{_id: new ObjectId(replyId)}}
      },
      {$set:{'replies.$.reported': true}},
      (err,doc)=>{
        if(err)
          console.log(err);
        console.log(doc);
        if(doc.value)
          res.send('success');
        else
          res.send('reported');
      }
      );
    });
  });
  
  
  
  

}
function recentThree(arr){
  var comm=[];
  for(var i= (arr.length-1); i>=(arr.length-3);i--){
    comm.push(arr[i]);
  }
  comm = comm.filter(obj => obj != null);
  return comm;
}
