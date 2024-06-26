const express=require('express')
const router=express.Router()
const User=require('../models/user')
const {jwtAuthMiddleware,generateToken}=require('../jwt')
const Candidate = require('../models/candidate')

const checkAdminRole=async(userID)=>{
    try{
        const user=await User.findById(userID)
        if(user.role==='admin'){
            return true;
        }
    }catch(e){
        console.log(e);
        return false
    }   
}


//POST route to add a candidate
router.post('/', jwtAuthMiddleware, async (req, res) => {
    try {
        if (!(await checkAdminRole(req.user.userData.id))) {
            console.log(req.user.userData.id)
            return res.status(403).json({
                message: "User does not have admin role"
            });
        }

        const data = req.body; // data in body  
        const existingCandidate = await Candidate.findOne({ name: data.name }); // Check if candidate already exists

        if (existingCandidate) {
            return res.status(409).json({
                message: "Candidate already exists"
            });
        }

        // creating a new candidate
        const newCandidate = new Candidate(data);

        // saving the data
        const response = await newCandidate.save();
        console.log("Data saved");
        res.status(200).json({ response: response });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            error: "Internal Server Error"
        });
    }
});

router.put("/:candidateID",jwtAuthMiddleware,async(req,res)=>{
    try{
        if(!(await checkAdminRole(req.user.id))){
            return res.status(403).json({
                message:"User does not have admin role" 
            })
        }

        const candidateID=req.params.candidateID
        const updatedCandidateData=req.body

        const response=await Candidate.findByIdAndUpdate(candidateID,updatedCandidateData,{
            new:true,
            runValidators:true
        })

        if(!response){
            return res.status(401).json({
                error:"candidate not found"
            })
        }

        console.log("candidate data updated");
        res.status(200).json(response)
    }catch(e){
        console.log(e);
        res.status(500).json({
            message:"Internal server error"
        })
    }
})


router.delete("/:candidateID",jwtAuthMiddleware,async(req,res)=>{
    try{
        if(!(await checkAdminRole(req.user.id))){
            return res.status(403).json({
                message:"User does not have admin role"
            })
        }

        const candidateID=req.params.candidateID
        
        const response=await Candidate.findByIdAndDelete(candidateID)

        if(!response){
            return res.status(401).json({
                error:"candidate not found"
            })
        }

        console.log("candidate deleted");
        res.status(200).json(response)
    }catch(e){
        console.log(e);
        res.status(500).json({
            message:"Internal server error"
        })
    }
})


//lets start voting 
router.post('/vote/:candidateID',jwtAuthMiddleware,async(req,res)=>{
    //no admin can vote
    //user can only vote once
    
    candidateID=req.params.candidateID
    userId=req.user.userData.id

    try{

        const candidate=await Candidate.findById(candidateID)
        if(!candidate){
            res.status(404).json({
                message:"candidate not found"
            })
        }
        const user=await User.findById(userId)
        if(!user){
            res.status(404).json({
                message:"user not found"
            })
        }
        if(user.role==='admin'){
            res.status(403).json({
                message:"Admin is not allowed"
            })
        }
        if(user.isVoted){
            res.status(400).json({
                message:"You have already voted"
            })
        }
        

        candidate.votes.push({user:userId})
        candidate.voteCount++
        await candidate.save()

        //update user doc
        user.isVoted=true
        await user.save()

        res.status(200).json({
            message:"Vote record successfully"
        })
    }catch(e){
        console.log(e);
        res.status(500).json({
            message:"Internal server error"
        })
    }
})

//vote count

router.get('/vote/count',async(req,res)=>{
    try{
        //find all rec and sort em in desc
        const candidate=await Candidate.find().sort({voteCount:'desc'})

        //map the candidates to only return their name and voteCount
        const voteRecord=candidate.map((data)=>{
            return{
                party:data.party,
                count:data.voteCount
            }
        })

        return res.status(200).json(voteRecord)

    }catch(e){
        console.log(e);
        res.status(500).json({
            message:"Internal server error"
        })
    }
})

router.get('/',async(req,res)=>{
    try{
        const candidates=await Candidate.find({},'name party -_id')

        res.status(200).json(candidates)
    }catch(e){
        console.log(e);
        res.status(500).json({error:"Internal Server Error"})
    }
})

module.exports=router
