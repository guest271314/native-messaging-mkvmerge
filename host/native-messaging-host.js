// https://github.com/simov/native-messaging
const sendMessage = require("./protocol")(handleMessage)
function handleMessage (req) {
  const {exec} = require("child_process");
  if (req.message === "write") {
    // MKVToolNix license https://gitlab.com/mbunkus/mkvtoolnix/blob/master/COPYING
    // execute `mkvmerge -o file.webm <options> '[' file1.webm file2.webm ... fileN.webm ']'`
    exec(req.body, (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        sendMessage({message: "stderr", body: err});
        return;
      }
      // `stdout`: message sent to `host` from `app`
      sendMessage({message: "output", body: stdout});   
    });    
  }
  // execute `mkvmerge -J file.webm` 
  if (req.message === "metadata") {
    exec(req.body, (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        sendMessage({message: "stderr", body: err});
        return;
      }
      sendMessage({message: "metadata", body: stdout});   
    });  
  }
}
