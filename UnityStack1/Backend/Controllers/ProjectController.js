const Project = require("../models/Project");
const ProjectHistory = require("../models/ProjectHistory");
const Organization = require("../models/Organization");
const Notification = require("../models/notification");
const Developer = require("../models/Develpor");
const Bid = require('../models/Bid');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Add this helper function at the top of the file after imports
const createNotification = async ({ userId, type, message, projectId }) => {
  try {
    await Notification.create({
      Organization: userId,
      title: type,
      message,
      type: 'info',
      link: projectId ? `/project/${projectId}` : null
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Create a new project
const createProject = async (req, res) => {
  try {
    const { title, description, skills, budget, deadline, type } = req.body;
    const userId = req.user._id;
    const userRole = req.userRole;

    // Validate required fields
    if (!title || !description || !skills || !budget || !deadline) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Create project object with common fields
    const projectData = {
      title,
      description,
      skills,
      budget,
      deadline,
      status: 'open',
      bids: [],
      file: req.file ? req.file.filename : null,
      type: type || 'Full Stack Project'
    };

    // Add user-specific fields based on role
    if (userRole === 'organization') {
      projectData.companyId = userId;
      projectData.companyName = req.user.companyName;
      projectData.createdBy = 'Organization';
    } else if (userRole === 'developer') {
      projectData.developerId = userId;
      projectData.developerName = `${req.user.firstName} ${req.user.lastName}`;
      projectData.createdBy = 'Developer';
    } else {
      // For students
      projectData.userId = userId;
      projectData.userName = `${req.user.firstName} ${req.user.lastName}`;
      projectData.createdBy = 'Student';
    }

    // Create and save the project
    const project = new Project(projectData);
    await project.save();

    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Error creating project", error: error.message });
  }
};

// Get all projects for a company
// Get all projects for the current user (works for all roles)
const getAllProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.userRole || req.user.role;
    
    let query = {
      status: { $ne: 'assigned' }, // Exclude assigned projects
      isVisible: true // Only show visible projects
    };

    // Add role-specific filters
    if (userRole === 'organization') {
      query.companyId = userId;
    } else if (userRole === 'developer') {
      query.developerId = userId;
    } else if (userRole === 'student') {
      query.userId = userId;
    } else {
      // Fallback for any other role
      query.$or = [
        { companyId: userId },
        { developerId: userId },
        { userId: userId }
      ];
    }

    const projects = await Project.find(query)
      .populate({
        path: 'bids',
        select: 'amount proposal userName userRole bidderId createdAt status'
      })
      .sort({ createdAt: -1 });

    // For each project, also populate the bid details for better display
    const populatedProjects = await Promise.all(
      projects.map(async (project) => {
        await project.populate({
          path: 'bids',
          model: 'Bid',
          select: 'amount proposal userName userRole bidderId createdAt status'
        });
        return project;
      })
    );

    res.status(200).json(populatedProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Error fetching projects", error: error.message });
  }
};

// Get project by ID
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate({
        path: 'bids.bidderId',
        select: 'firstName lastName companyName email profilePicture rating experience skills'
      });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Error fetching project" });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, skills, budget, deadline, type } = req.body;
    
    // Find the project first
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    // Check if the user owns this project
    if (project.userId && project.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to update this project" 
      });
    }

    // Update the project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        title,
        description,
        skills,
        budget: Number(budget),
        deadline: new Date(deadline),
        type,
        lastUpdate: new Date()
      },
      { new: true, runValidators: true }
    ).populate('bids');

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject
    });

  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update project",
      error: error.message
    });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const companyId = req.user.id;

    const project = await Project.findOneAndDelete({ _id: projectId, companyId });
    if (!project) {
      return res.status(404).json({ message: "Project not found or unauthorized" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Error deleting project" });
  }
};

// Close a project
const closeProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role || 'Organization'; // Default to Organization if role not specified

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (permanent) {
      // Permanently delete the project
      await Project.findByIdAndDelete(id);
      
      // Create history entry for deletion
      await ProjectHistory.create({
        projectId: id,
        projectTitle: project.title,
        action: "deleted",
        details: "Project was permanently deleted",
        performedBy: userId,
        performedByRole: userRole
      });

      return res.json({ message: "Project deleted successfully" });
    } else {
      // Just close the project
      project.status = "closed";
      project.closedAt = new Date();
      await project.save();

      // Create history entry for closure
      await ProjectHistory.create({
        projectId: id,
        projectTitle: project.title,
        action: "closed",
        details: "Project was closed",
        performedBy: userId,
        performedByRole: userRole
      });

      return res.json({ message: "Project closed successfully" });
    }
  } catch (error) {
    console.error("Error in closeProject:", error);
    return res.status(500).json({ message: "Error closing project", error: error.message });
  }
};

// Assign project to developer
const assignProject = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { developerId, status = "assigned", startDate } = req.body;

    console.log("Assigning project:", projectId, "to developer:", developerId);

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    // Get user information
    const currentUserId = req.user._id || req.user.id;
    console.log("Current user ID:", currentUserId);

    // Check authorization
    let isAuthorized = false;
    if (project.userId && project.userId.toString() === currentUserId.toString()) {
      isAuthorized = true;
    } else if (project.companyId && project.companyId.toString() === currentUserId.toString()) {
      isAuthorized = true;
    } else if (project.developerId && project.developerId.toString() === currentUserId.toString()) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      console.log("Authorization failed for user:", currentUserId);
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to assign this project" 
      });
    }

    // Find the accepted bid
    const acceptedBid = req.body.bidId 
      ? await Bid.findById(req.body.bidId)
      : await Bid.findOne({
          projectId: project._id,
          $or: [{ bidderId: developerId }, { userId: developerId }]
        });

    if (!acceptedBid) {
      return res.status(400).json({
        success: false,
        message: "No valid bid found for this developer"
      });
    }

    console.log("Found accepted bid:", acceptedBid);

    // Update project with assignment details
    const updateData = {
      assignedDeveloper: developerId,
      status: "assigned",
      assignedDate: new Date(),
      isVisible: false,
      paymentStatus: 'pending',
      acceptedBid: acceptedBid._id,
      acceptedBidAmount: acceptedBid.amount,
      developerId: developerId // Add this to ensure proper linking
    };

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true }
    ).populate('assignedDeveloper', 'firstName lastName email');

    console.log("Project assigned successfully with status: assigned");
    console.log("Updated project:", updatedProject);

    // Create notification for the developer
    await createNotification({
      userId: developerId,
      type: 'Project Assigned',
      message: `You have been assigned to project: ${project.title}`,
      projectId: project._id
    });

    res.status(200).json({
      success: true,
      message: "Project assigned successfully",
      data: updatedProject
    });

  } catch (error) {
    console.error('Error assigning project:', error);
    res.status(500).json({
      success: false,
      message: "Failed to assign project",
      error: error.message
    });
  }
};

// Get project history
const getProjectHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const userRole = req.userRole || req.user.role;
    
    console.log("Fetching project history for user:", userId, "with role:", userRole);
    
    // Query to get all projects assigned to the developer
    let query = {
      $or: [
        { assignedDeveloper: userId },
        { developerId: userId }
      ]
    };

    // Get all projects assigned to the user
    const projects = await Project.find(query)
      .populate('assignedDeveloper', 'firstName lastName email')
      .populate('companyId', 'companyName email') 
      .populate('userId', 'firstName lastName email')
      .populate('developerId', 'firstName lastName email')
      .sort({ updatedAt: -1 });

    console.log("Found projects for history:", projects.length);

    // Calculate stats
    const totalProjects = projects.length; // Total assigned projects
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const cancelledProjects = projects.filter(p => p.status === 'cancelled').length;

    // Calculate total earnings from withdrawn amounts for assigned projects
    const totalEarnings = projects
      .filter(p => 
        (p.assignedDeveloper && p.assignedDeveloper._id.toString() === userId.toString()) && 
        p.paymentStatus === 'released'
      )
      .reduce((sum, p) => sum + (p.acceptedBidAmount || 0), 0);

    console.log("Calculated earnings:", totalEarnings);
    console.log("Projects with released payments:", projects.filter(p => p.paymentStatus === 'released').length);

    const stats = {
      total: totalProjects,
      completed: completedProjects,
      cancelled: cancelledProjects,
      totalEarnings: totalEarnings
    };

    console.log("Project history stats:", stats);

    res.status(200).json({
      projects,
      stats
    });
  } catch (error) {
    console.error("Error fetching project history:", error);
    res.status(500).json({ message: "Error fetching project history" });
  }
};

// Inside the 'submitBid' function in your controller

const submitBid = async (req, res) => {
  try {
    const { amount, proposal } = req.body;
    const { id: projectId } = req.params;
    const user = req.user;
    const userRole = req.userRole;

    // Validate required fields
    if (!amount || !proposal || !projectId) {
      return res.status(400).json({ message: "Amount and proposal are required" });
    }

    // Get user's name based on role
    let userName = '';
    if (userRole === 'developer') {
      userName = `${user.firstName} ${user.lastName}`;
    } else if (userRole === 'organization') {
      userName = user.companyName;
    } else {
      userName = `${user.firstName} ${user.lastName}`;
    }

    // Create a new Bid document
    const newBid = new Bid({
      amount,
      proposal,
      bidderName: userName,
      userRole,
      userName,
      bidderId: user._id,
      projectId
    });

    await newBid.save();

    // Add bid to project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.bids.push(newBid._id);
    await project.save();

    res.status(201).json({ 
      message: "Bid submitted successfully", 
      bid: {
        _id: newBid._id,
        amount: newBid.amount,
        proposal: newBid.proposal,
        userName: newBid.userName,
        userRole: newBid.userRole,
        createdAt: newBid.createdAt
      }
    });
  } catch (error) {
    console.error("Error submitting bid:", error);
    res.status(500).json({ message: "Error submitting bid", error: error.message });
  }
};

// Get project bids
// Get project bids
// Get project bids
const getProjectBids = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.user._id;
    const userRole = req.userRole || req.user.role;

    // Fetch the project first
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check authorization based on user role and project ownership
    let hasAccess = false;

    if (userRole === 'organization' && project.companyId) {
      hasAccess = project.companyId.toString() === userId.toString();
    } else if (userRole === 'developer' && project.developerId) {
      hasAccess = project.developerId.toString() === userId.toString();
    } else if (userRole === 'student' && project.userId) {
      hasAccess = project.userId.toString() === userId.toString();
    }

    // Also allow access if the user is assigned to the project
    if (!hasAccess && project.assignedDeveloper) {
      hasAccess = project.assignedDeveloper.toString() === userId.toString();
    }

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied - you can only view bids for your own projects" });
    }

    // Populate the bids
    await project.populate({
      path: 'bids',
      model: 'Bid',
      select: 'amount proposal userName userRole bidderId createdAt status'
    });

    // Format the bids data to match the expected frontend format
    const formattedBids = project.bids.map(bid => ({
      _id: bid._id,
      userName: bid.userName || "Anonymous Developer",
      userRole: bid.userRole || "Developer", 
      amount: bid.amount,
      proposal: bid.proposal,
      bidderId: bid.bidderId,
      userId: bid.bidderId, // Also add userId for consistency
      createdAt: bid.createdAt,
      submittedAt: bid.createdAt, // Add submittedAt for compatibility
      status: bid.status || 'pending'
    }));

    res.status(200).json({
      projectId: project._id,
      projectTitle: project.title,
      bids: formattedBids
    });

  } catch (error) {
    console.error("Error fetching project bids:", error);
    res.status(500).json({ message: "Error fetching project bids", error: error.message });
  }
};

// Get active projects
const getActiveProjects = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const userRole = req.userRole || req.user.role;
    
    console.log("Fetching active projects for user:", userId, "with role:", userRole);
    
    // Query to find all active projects for the user
    let query = {
      $or: [
        { userId: userId },
        { companyId: userId },
        { developerId: userId },
        { assignedDeveloper: userId }
      ],
      status: { $in: ['in-progress', 'submitted', 'rejected'] }
    };

    console.log("Active projects query:", JSON.stringify(query, null, 2));

    const activeProjects = await Project.find(query)
      .populate('assignedDeveloper', 'firstName lastName email')
      .sort({ assignedDate: -1 });

    console.log("Found active projects:", activeProjects.length);
    console.log("Project details:", activeProjects.map(p => ({
      id: p._id,
      title: p.title,
      status: p.status,
      paymentStatus: p.paymentStatus,
      assignedDeveloper: p.assignedDeveloper,
      developerId: p.developerId
    })));

    res.status(200).json(activeProjects);
  } catch (error) {
    console.error("Error fetching active projects:", error);
    res.status(500).json({ 
      message: "Error fetching active projects", 
      error: error.message 
    });
  }
};

// Update project payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const userId = req.user._id;
    const userRole = req.userRole || req.user.role;

    // Build query based on user role
    let query = { _id: id };
    if (userRole === 'organization') {
      query.companyId = userId;
    } else if (userRole === 'developer') {
      query.developerId = userId;
    } else if (userRole === 'student') {
      query.userId = userId;
    }

    const project = await Project.findOne(query);
    if (!project) {
      return res.status(404).json({ message: "Project not found or unauthorized" });
    }

    project.paymentStatus = paymentStatus;
    project.paymentDate = new Date();
    
    if (paymentStatus === 'paid' && !project.startDate) {
      project.startDate = new Date();
      project.status = 'in-progress';
    }

    await project.save();

    res.status(200).json(project);
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Error updating payment status" });
  }
};

// Update project progress
const updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    const userId = req.user._id;
    const userRole = req.userRole || req.user.role;

    // Build query based on user role
    let query = { _id: id };
    if (userRole === 'organization') {
      query.companyId = userId;
    } else if (userRole === 'developer') {
      query.developerId = userId;
    } else if (userRole === 'student') {
      query.userId = userId;
    }

    const project = await Project.findOne(query);
    if (!project) {
      return res.status(404).json({ message: "Project not found or unauthorized" });
    }

    project.progress = progress;
    await project.save();

    res.status(200).json(project);
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ message: "Error updating progress" });
  }
};

// Get all available projects for bidding
// Get all available projects for bidding
const getAvailableProjects = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const userRole = req.userRole || req.user.role;
    
    // Build query to exclude user's own projects based on their role
    let query = {
      status: 'open', // Only show open projects
      $and: [
        // Exclude projects created by the current user based on their role
        { companyId: { $ne: currentUserId } },
        { developerId: { $ne: currentUserId } },
        { userId: { $ne: currentUserId } }
      ]
    };

    const projects = await Project.find(query)
      .populate({
        path: 'bids',
        select: 'amount proposal userName userRole bidderId createdAt status'
      })
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching available projects:", error);
    res.status(500).json({ message: "Error fetching available projects" });
  }
};

// Get assigned projects
const getAssignedProjects = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    console.log("Fetching assigned projects for user:", userId);

    // Get all projects assigned to this developer
    const projects = await Project.find({
      assignedDeveloper: userId
    })
    .populate('assignedDeveloper', 'firstName lastName email')
    .populate('companyId', 'companyName email')
    .populate('userId', 'firstName lastName email')
    .populate('developerId', 'firstName lastName email')
    .sort({ updatedAt: -1 });

    console.log("Found assigned projects:", projects.length);

    // Calculate stats
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const cancelledProjects = projects.filter(p => p.status === 'cancelled').length;
    const totalEarnings = projects
      .filter(p => p.paymentStatus === 'released' || p.paymentStatus === 'paid')
      .reduce((sum, p) => sum + (p.acceptedBidAmount || 0), 0);

    const stats = {
      total: totalProjects,
      completed: completedProjects,
      cancelled: cancelledProjects,
      totalEarnings: totalEarnings
    };

    console.log("Project stats:", stats);

    res.status(200).json({
      projects,
      stats
    });
  } catch (error) {
    console.error("Error fetching assigned projects:", error);
    res.status(500).json({ message: "Error fetching assigned projects" });
  }
};

// Get invoice projects
const getInvoiceProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.userRole || req.user.role;
    
    // Build query based on user role
    let query = {
      $or: [
        // For pending payments
        { status: 'assigned', paymentStatus: 'pending' },
        // For paid/released projects
        { status: { $in: ['in-progress', 'completed'] }, paymentStatus: { $in: ['paid', 'released'] } },
        // For completed projects
        { status: 'completed', paymentStatus: { $in: ['paid', 'released'] } }
      ]
    };

    // Add role-specific filters - only show invoices to the person who made the payment
    if (userRole === 'organization') {
      query.companyId = userId; // Only show projects created by this organization
    } else if (userRole === 'developer') {
      query.developerId = userId; // Only show projects created by this developer
    } else if (userRole === 'student') {
      query.userId = userId; // Only show projects created by this student
    }

    const projects = await Project.find(query)
      .populate('assignedDeveloper', 'firstName lastName email profilePicture')
      .populate('companyId', 'companyName email')
      .populate('userId', 'firstName lastName email')
      .populate('developerId', 'firstName lastName email')
      .populate('acceptedBid', 'amount proposal userName')
      .sort({ updatedAt: -1 });

    console.log("📋 Found invoice projects:", projects.length);
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching invoice projects:", error);
    res.status(500).json({ message: "Error fetching invoice projects" });
  }
};

// Get projects assigned by the current user
const getAssignedByMe = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.userRole || req.user.role;

    let query = {
      status: { $in: ['in-progress', 'submitted', 'rejected', 'completed'] },
      paymentStatus: { $in: ['paid', 'released'] }
    };

    // Add role-specific filters
    if (userRole === 'organization') {
      query.companyId = userId;
    } else if (userRole === 'developer') {
      query.developerId = userId;
    } else if (userRole === 'student') {
      query.userId = userId;
    }

    const projects = await Project.find(query)
      .populate('assignedDeveloper', 'firstName lastName email profilePicture')
      .populate('bids')
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching assigned projects:", error);
    res.status(500).json({ 
      message: "Error fetching assigned projects", 
      error: error.message 
    });
  }
};

// Get find work invoice projects
const getFindWorkInvoices = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.userRole;
    
    // Show projects that the developer has worked on with various payment statuses
    const query = {
      $or: [
        { assignedDeveloper: userId },
        { developerId: userId }
      ],
      status: { $in: ['completed', 'in-progress'] },
      paymentStatus: { $in: ['paid', 'released'] }
    };

    const projects = await Project.find(query)
      .populate('assignedDeveloper', 'firstName lastName email profilePicture')
      .populate('companyId', 'companyName email')
      .populate('userId', 'firstName lastName email')
      .populate('developerId', 'firstName lastName email')
      .populate('acceptedBid', 'amount proposal userName')
      .sort({ updatedAt: -1 });

    console.log("📋 Found find work invoice projects:", projects.length);
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching find work invoice projects:", error);
    res.status(500).json({ message: "Error fetching find work invoice projects" });
  }
};

// Generate and download invoice
const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.userRole;

    // Find the project
    const project = await Project.findById(id)
      .populate('assignedDeveloper', 'firstName lastName email')
      .populate('companyId', 'companyName email')
      .populate('userId', 'firstName lastName email')
      .populate('developerId', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check authorization
    const isAuthorized = 
      project.assignedDeveloper?._id.toString() === userId.toString() ||
      project.developerId?._id.toString() === userId.toString() ||
      project.userId?._id.toString() === userId.toString() ||
      project.companyId?._id.toString() === userId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to download this invoice" });
    }

    // Create PDF
    const doc = new PDFDocument();
    const invoicePath = path.join(__dirname, `../uploads/invoices/invoice-${id}.pdf`);

    // Ensure directory exists
    const dir = path.dirname(invoicePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(invoicePath));

    // Add content to PDF
    doc.fontSize(25).text('Invoice', { align: 'center' });
    doc.moveDown();

    // Project Details
    doc.fontSize(14).text('Project Details:', { underline: true });
    doc.fontSize(12).text(`Title: ${project.title}`);
    doc.text(`Status: ${project.status}`);
    doc.text(`Payment Status: ${project.paymentStatus}`);
    doc.moveDown();

    // Client Details
    doc.fontSize(14).text('Client Details:', { underline: true });
    if (project.companyId) {
      doc.fontSize(12).text(`Company: ${project.companyId.companyName}`);
    } else if (project.userId) {
      doc.fontSize(12).text(`Client: ${project.userId.firstName} ${project.userId.lastName}`);
    }
    doc.moveDown();

    // Developer Details
    doc.fontSize(14).text('Developer Details:', { underline: true });
    if (project.assignedDeveloper) {
      doc.fontSize(12).text(`Developer: ${project.assignedDeveloper.firstName} ${project.assignedDeveloper.lastName}`);
    } else if (project.developerId) {
      doc.fontSize(12).text(`Developer: ${project.developerId.firstName} ${project.developerId.lastName}`);
    }
    doc.moveDown();

    // Payment Details
    doc.fontSize(14).text('Payment Details:', { underline: true });
    const totalAmount = project.acceptedBidAmount || project.budget;
    const platformFee = totalAmount * 0.10;
    const finalAmount = totalAmount - platformFee;

    doc.fontSize(12).text(`Total Amount: PKR ${totalAmount.toLocaleString()}`);
    doc.text(`Platform Fee (10%): PKR ${platformFee.toLocaleString()}`);
    doc.text(`Final Amount: PKR ${finalAmount.toLocaleString()}`);
    doc.moveDown();

    // Dates
    doc.fontSize(14).text('Dates:', { underline: true });
    doc.fontSize(12).text(`Created: ${new Date(project.createdAt).toLocaleDateString()}`);
    if (project.completedAt) {
      doc.text(`Completed: ${new Date(project.completedAt).toLocaleDateString()}`);
    }
    if (project.paymentDate) {
      doc.text(`Payment Date: ${new Date(project.paymentDate).toLocaleDateString()}`);
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });

    // Send the PDF file
    res.download(invoicePath, `invoice-${id}.pdf`, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Clean up: delete the file after sending
      fs.unlink(invoicePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temporary file:', unlinkErr);
        }
      });
    });

  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Error generating invoice" });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  closeProject,
  assignProject,
  getProjectHistory,
  submitBid,
  getProjectBids,
  getActiveProjects,
  updatePaymentStatus,
  updateProgress,
  getAvailableProjects,
  getAssignedProjects,
  getInvoiceProjects,
  getFindWorkInvoices,
  getAssignedByMe,
  downloadInvoice
};