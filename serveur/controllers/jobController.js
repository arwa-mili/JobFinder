import mongoose from "mongoose";
import Jobs from "../models/jobsModel.js";
import Companies from "../models/companiesModel.js";
import multer from 'multer';
import path from 'path';
import ApplicationsModel from "../models/applicationsModel.js";





export const createJob = async (req, res, next) =>
{
  try
  {
    const {
      jobTitle,
      jobType,
      location,
      salary,
      vacancies,
      experience,
      desc,
      requirements,
    } = req.body;

    if (
      !jobTitle ||
      !jobType ||
      !location ||
      !salary ||
      !requirements ||
      !desc
    )
    {
      next("Please Provide All Required Fields");
      return;
    }

    const id = req.body.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(404).send(`No Company with id: ${id}`);

    const jobPost = {
      jobTitle,
      jobType,
      location,
      salary,
      vacancies,
      experience,
      detail: { desc, requirements },
      company: id,
    };

    const job = new Jobs(jobPost);
    await job.save();

    //update the company information with job id
    const company = await Companies.findById(id);

    company.jobPosts.push(job._id);
    const updateCompany = await Companies.findByIdAndUpdate(id, company, {
      new: true,
    });

    res.status(200).json({
      success: true,
      message: "Job Posted SUccessfully",
      job,
    });
  } catch (error)
  {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const updateJob = async (req, res, next) =>
{
  try
  {
    const {
      jobTitle,
      jobType,
      location,
      salary,
      vacancies,
      experience,
      desc,
      requirements,
    } = req.body;
    const { jobId } = req.params;

    if (
      !jobTitle ||
      !jobType ||
      !location ||
      !salary ||
      !desc ||
      !requirements
    )
    {
      next("Please Provide All Required Fields");
      return;
    }
    const id = req.body.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(404).send(`No Company with id: ${id}`);

    const jobPost = {
      jobTitle,
      jobType,
      location,
      salary,
      vacancies,
      experience,
      detail: { desc, requirements },
      _id: jobId,
    };

    await Jobs.findByIdAndUpdate(jobId, jobPost, { new: true });

    res.status(200).json({
      success: true,
      message: "Job Post Updated SUccessfully",
      jobPost,
    });
  } catch (error)
  {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const getJobPosts = async (req, res, next) =>
{
  try
  {
    const { search, sort, location, jtype, exp } = req.query;
    const types = jtype?.split(","); //full-time,part-time
    const experience = exp?.split("-"); //2-6

    let queryObject = {};

    if (location)
    {
      queryObject.location = { $regex: location, $options: "i" };
    }

    if (jtype)
    {
      queryObject.jobType = { $in: types };
    }

    //    [2. 6]

    if (exp)
    {
      queryObject.experience = {
        $gte: Number(experience[0]) - 1,
        $lte: Number(experience[1]) + 1,
      };
    }

    if (search)
    {
      const searchQuery = {
        $or: [
          { jobTitle: { $regex: search, $options: "i" } },
          { jobType: { $regex: search, $options: "i" } },
        ],
      };
      queryObject = { ...queryObject, ...searchQuery };
    }

    let queryResult = Jobs.find(queryObject).populate({
      path: "company",
      select: "-password",
    });

    // SORTING
    if (sort === "Newest")
    {
      queryResult = queryResult.sort("-createdAt");
    }
    if (sort === "Oldest")
    {
      queryResult = queryResult.sort("createdAt");
    }
    if (sort === "A-Z")
    {
      queryResult = queryResult.sort("jobTitle");
    }
    if (sort === "Z-A")
    {
      queryResult = queryResult.sort("-jobTitle");
    }

    // pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    //records count
    const totalJobs = await Jobs.countDocuments(queryResult);
    const numOfPage = Math.ceil(totalJobs / limit);

    queryResult = queryResult.limit(limit * page);

    const jobs = await queryResult;

    res.status(200).json({
      success: true,
      totalJobs,
      data: jobs,
      page,
      numOfPage,
    });
  } catch (error)
  {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const applyNow = async (req, res, next) =>
{
  try
  {
    const { id } = req.params;
    const { coverLetter, name, surname, email } = req.body;

    if (!coverLetter || !req.file)
    {
      return res.status(400).json({ message: "Please provide cover letter and CV" });
    }

    const applicationData = {
      coverLetter,
      pdf: req.file.filename,
      candidateName: name,
      candidateSurname: surname,
      email,
    };

    const application = new ApplicationsModel(applicationData);
    await application.save();

    const job = await Jobs.findById({ _id: id }).populate({
      path: "company",
      select: "-password",
    });

    if (!job)
    {
      return res.status(404).json({ message: "Job not found" });
    }

    job.applicants.push(application._id);
    await job.save();

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error)
  {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const getJobsByCompanyId = async (req, res, next) =>
{
  try
  {
    const { _id } = req.params;

    console.log("Company ID:", _id);

    const jobs = await Jobs.find({ company: _id }).populate({
      path: "applicants",
      select: "-password",
    });

    // Filter jobs with non-empty applicants list
    const jobsWithApplicants = jobs.filter((job) => job.applicants.length > 0);

    // Transform jobs data to the desired response format

    const transformedJobs = jobsWithApplicants.map((job) => ({

      jobTitle: job.jobTitle,
      jobid: job._id,
      applicants: job.applicants.map((applicant) =>
      {
        // Ensure that 'applicant.pdf' is defined before using it
        const cvUrl = applicant.pdf ? `/api-v1/jobs/download/${applicant.pdf}` : null;

        return {
          id: applicant._id,
          candidateName: applicant.candidateName,
          candidateSurname: applicant.candidateSurname,
          email: applicant.email,
          coverLetter: applicant.coverLetter,
          cv: cvUrl,
          AppStatus: applicant.status,
        };
      }),
    }));

    res.status(200).json({
      success: true,
      data: transformedJobs,
    });
  } catch (error)
  {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};




export const getJobById = async (req, res, next) =>
{
  try
  {
    const { id } = req.params;

    const job = await Jobs.findById({ _id: id }).populate({
      path: "company",
      select: "-password",
    });

    if (!job)
    {
      return res.status(200).send({
        message: "Job Post Not Found",
        success: false,
      });
    }

    //GET SIMILAR JOB POST
    const searchQuery = {
      $or: [
        { jobTitle: { $regex: job?.jobTitle, $options: "i" } },
        { jobType: { $regex: job?.jobType, $options: "i" } },
      ],
    };

    let queryResult = Jobs.find(searchQuery)
      .populate({
        path: "company",
        select: "-password",
      })
      .sort({ _id: -1 });

    queryResult = queryResult.limit(6);
    const similarJobs = await queryResult;

    res.status(200).json({
      success: true,
      data: job,
      similarJobs,
    });
  } catch (error)
  {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const deleteJobPost = async (req, res, next) =>
{
  try
  {
    const { id } = req.params;

    await Jobs.findByIdAndDelete(id);

    res.status(200).send({
      success: true,
      messsage: "Job Post Delted Successfully.",
    });
  } catch (error)
  {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};



export const deleteJobApplication = async (req, res, next) =>
{
  try
  {
    const { jobId, applicantId } = req.params;

    const job = await Jobs.findById(jobId);

    if (!job)
    {
      return res.status(404).json({ error: "Job not found" });
    }

    const applicantIndex = job.applicants.findIndex((applicant) => applicant._id == applicantId);

    if (applicantIndex === -1)
    {
      return res.status(404).json({ error: "Applicant not found" });
    }

    job.applicants.splice(applicantIndex, 1);
    await job.save();

    res.status(200).json({
      success: true,
      message: "Job application deleted successfully",
    });
  } catch (error)
  {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


export const updateJobApplication = async (req, res, next) =>
{
  try
  {
    const { jobId, applicantId } = req.params;
    const { status } = req.body;

    // Populate the 'applicants' field when querying for the job
    const job = await Jobs.findById(jobId).populate('applicants');

    if (!job)
    {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Find the applicant by ID in the applicants array
    const applicantIndex = job.applicants.findIndex((applicant) => String(applicant._id) === String(applicantId));

    if (applicantIndex === -1)
    {
      return res.status(404).json({ error: 'Applicant not found' });
    }

    // Get the applicant ID
    const applicantObjectId = job.applicants[applicantIndex]._id;


    const applicantt = await ApplicationsModel.findByIdAndUpdate(applicantObjectId, { status: status });
    console.log(applicantt)
 
    await job.save();

    await applicantt.save();





    res.status(200).json({
      success: true,
      status: applicantt.status,
      message: 'Job application updated successfully',
    });
  } catch (error)
  {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};




/*
export const updateJobApplication = async (req, res, next) =>
{
  try
  {
    const { jobId, applicantId } = req.params;
    const { status } = req.body;

    // Populate the 'applicants' field when querying for the job
    const job = await Jobs.findById(jobId).populate('applicants');

    if (!job)
    {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Find the applicant by ID in the applicants array
    const applicantIndex = job.applicants.findIndex((applicant) => String(applicant._id) === String(applicantId));

    if (applicantIndex === -1)
    {
      return res.status(404).json({ error: 'Applicant not found' });
    }

    // Get the applicant ID
    const applicantObjectId = job.applicants[applicantIndex]._id;

    // Update the status of the applicant
    job.applicants[applicantIndex].status = status;

    // Save changes to the job
    await job.save();

    res.status(200).json({
      success: true,
      status: status,
      message: 'Job application updated successfully',
    });
  } catch (error)
  {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
*/
