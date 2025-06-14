import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useParams, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { FaEdit, FaPlus, FaCamera, FaLinkedin, FaGithub } from "react-icons/fa";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Header from "../components/header";
const expertiseOptions = ["JavaScript", "Python", "React", "Node.js", "Django", "Java", "SQL", "C++", "Swift", "Go"];

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [developer, setDeveloper] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [expertise, setExpertise] = useState([]);
  const [showExpertisePopup, setShowExpertisePopup] = useState(false);
  const [newExpertise, setNewExpertise] = useState({ domain: "", experienceYears: "", projects: "" });
  const [jobExperience, setJobExperience] = useState([]);
  const [showJobPopup, setShowJobPopup] = useState(false);
  const [newJob, setNewJob] = useState({ companyName: "", position: "", startDate: "", endDate: "" });
  const [showEditExpertisePopup, setShowEditExpertisePopup] = useState(false);
const [editExpertise, setEditExpertise] = useState({});
const [showEditJobPopup, setShowEditJobPopup] = useState(false);
const [editJob, setEditJob] = useState({});
const [showLoginModal, setShowLoginModal] = useState(false);

// ✅ Open Edit Expertise Modal
const handleEditExpertise = (expertise) => {
    setEditExpertise(expertise);
    setShowEditExpertisePopup(true);
};

// ✅ Save Edited Expertise
const handleUpdateExpertise = async () => {
    if (!editExpertise._id) {
        console.error("❌ Expertise ID is missing.");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to update expertise.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/developers/expertise/${editExpertise._id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                domain: editExpertise.domain,
                experienceYears: editExpertise.experienceYears,
                projects: editExpertise.projects
            })
        });

        if (!response.ok) {
            throw new Error("Failed to update expertise.");
        }

        const updatedData = await response.json();
        setExpertise(updatedData.expertise);
        setShowEditExpertisePopup(false);
        alert("Expertise updated successfully!");
    } catch (error) {
        console.error("❌ Error updating expertise:", error);
        alert("Failed to update expertise. Please try again.");
    }
};

  

// ✅ Open Edit Job Experience Modal
const handleEditJobExperience = (job) => {
    console.log("Selected Job for Editing:", job); // ✅ Log job before setting state
    setEditJob(job); // ✅ Set job for editing
    setShowEditJobPopup(true);
};


// ✅ Save Edited Job Experience
const handleUpdateJobExperience = async () => {
    console.log("Editing Job:", editJob);

    if (!editJob._id) {
        console.error("❌ Job ID is missing.");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to update job experience.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/developers/job/${editJob._id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                companyName: editJob.companyName,
                position: editJob.position,
                startDate: editJob.startDate,
                endDate: editJob.endDate
            })
        });

        if (!response.ok) {
            throw new Error("Failed to update job experience.");
        }

        const updatedData = await response.json();
        setJobExperience(updatedData.employment);
        setShowEditJobPopup(false);
        alert("Job experience updated successfully!");
    } catch (error) {
        console.error("❌ Error updating job experience:", error);
        alert("Failed to update job experience. Please try again.");
    }
};





  useEffect(() => {
    const fetchUser = async () => {
      try {
        // First try to get user from localStorage token
        const token = localStorage.getItem("token");
        if (!token) {
          console.log("No token found in localStorage");
          return;
        }

        const response = await fetch("http://localhost:5000/api/user", { 
          method: "GET", 
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error("Error fetching logged-in user");
        const userData = await response.json();
        console.log("Logged-in user data:", userData);
        setLoggedInUser(userData);
      } catch (error) {
        console.error("❌ Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/developers/${id}`);
        if (!response.ok) throw new Error("Error fetching profile");
        const data = await response.json();
        console.log("Developer profile data:", data);
        setDeveloper(data);
        setFormData({
          about: data.about || "",
          hourlyRate: data.hourlyRate || "",
          workingHours: data.workingHours || { from: "", to: "" },
          linkedIn: data.linkedIn || "",
          github: data.github || "",
        });
        setExpertise(data.expertise || []);
        setJobExperience(data.employment || []);
      } catch (error) {
        console.error("❌ Error fetching developer:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <div>Loading...</div>;

  // Check if the current user is the owner of this profile
  const isOwner = loggedInUser && developer && 
                 (String(loggedInUser.id) === String(developer._id) || 
                  String(loggedInUser._id) === String(developer._id));

  console.log("isOwner check:", {
    loggedInUserId: loggedInUser?.id || loggedInUser?._id,
    developerId: developer?._id,
    isOwner: isOwner
  });

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone!")) {
        return;
    }

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("You must be logged in to delete your account.");
            return;
        }

        const response = await fetch("http://localhost:5000/api/developers/delete-account", {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Failed to delete account.");

        // Clear token and redirect
        localStorage.removeItem("token");
        alert("Your account has been deleted successfully.");
        navigate("/"); // Use navigate instead of window.location for React Router
    } catch (error) {
        console.error("❌ Error deleting account:", error);
        alert("Failed to delete account. Please try again.");
    }
};


  const handleProfileUpdate = async () => {
    console.log("Saving Changes...");
    
    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to update your profile.");
        return;
    }
    
    const formDataToSend = new FormData();
    formDataToSend.append("about", formData.about);
    formDataToSend.append("hourlyRate", formData.hourlyRate);
    formDataToSend.append("workingHours", JSON.stringify(formData.workingHours));
    formDataToSend.append("expertise", JSON.stringify(expertise));
    formDataToSend.append("linkedIn", formData.linkedIn);
    formDataToSend.append("github", formData.github);
    formDataToSend.append("employment", JSON.stringify(jobExperience));
    if (profileImage) {
        formDataToSend.append("profileImage", profileImage);
    }

    try {
        const response = await fetch("http://localhost:5000/api/developers/profile", {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`
                // Note: Don't set Content-Type for FormData
            },
            body: formDataToSend,
        });

        if (!response.ok) {
            throw new Error("Failed to update profile");
        }

        const updatedData = await response.json();

        // Show success message
        alert("Profile updated successfully!");
        
        // Update the local state to reflect the new changes
        setDeveloper(prevDeveloper => ({
            ...prevDeveloper,
            ...updatedData
        }));
        setEditMode(false); // Exit edit mode on successful update
    } catch (error) {
        console.error("❌ Error updating profile:", error);
        alert("Failed to update profile. Please try again.");
    }
};




  const addExpertise = () => {
    if (newExpertise.domain && newExpertise.experienceYears && newExpertise.projects) {
      setExpertise([...expertise, newExpertise]);
      setNewExpertise({ domain: "", experienceYears: "", projects: "" });
      setShowExpertisePopup(false);
    }
  };
  const addJobExperience = () => {
    if (newJob.companyName && newJob.position && newJob.startDate && newJob.endDate) {
      setJobExperience([...jobExperience, newJob]);
      setNewJob({ companyName: "", position: "", startDate: "", endDate: "" });
      setShowJobPopup(false);
    }
  };
  // ✅ Remove an Expertise
  const handleDeleteExpertise = async (expertiseId) => {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to delete expertise.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/developers/expertise/${expertiseId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Failed to delete expertise.");

        setExpertise(prevExpertise => prevExpertise.filter(exp => exp._id !== expertiseId));
        alert("Expertise deleted successfully!");
    } catch (error) {
        console.error("❌ Error removing expertise:", error);
        alert("Failed to delete expertise. Please try again.");
    }
};


// ✅ Remove a Job Experience
const handleDeleteJobExperience = async (jobId) => {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to delete job experience.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/developers/job/${jobId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Failed to delete job experience.");

        setJobExperience(prevJobs => prevJobs.filter(job => job._id !== jobId));
        alert("Job experience deleted successfully!");
    } catch (error) {
        console.error("❌ Error removing job experience:", error);
        alert("Failed to delete job experience. Please try again.");
    }
};
const convertTo12Hour = (time24) => {
    const [hour, minute] = time24.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "pm" : "am";
    const adjustedHour = h % 12 || 12;
    return `${adjustedHour}:${minute} ${ampm}`;
  };
  const formatDate = (isoDate) => {
    if (!isoDate) return "N/A";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(isoDate).toLocaleDateString("en-US", options);
  };
  

  const handleMessageClick = () => {
    if (!loggedInUser) {
      setShowLoginModal(true);
    } else {
      // Store the developer ID in localStorage and navigate to chat
      localStorage.setItem('selectedChatDeveloper', developer._id);
      navigate('/chat');
    }
  };

  return (
    <>
      <Header />
      <div className="container mt-4">
        <div className="d-flex gap-4">
        <div className="text-center" style={{ width: "300px", borderRight: "1px solid #ddd" }}>
        <label htmlFor="profileImageUpload" style={{ cursor: "pointer" }}>
    <img
        src={profileImage ? URL.createObjectURL(profileImage) : developer?.profileImage || "/default-avatar.png"}
        alt="Profile"
        width="150"
        style={{ borderRadius: '50%', height: '150px', objectFit: 'cover' }} 
    />
    {editMode && <FaCamera style={{ position: "absolute", marginLeft: "-30px", cursor: "pointer" }} />}
</label>
{editMode && (
    <input
        type="file"
        id="profileImageUpload"
        style={{ display: "none" }}
        accept="image/*"
        onChange={(e) => {
            if (e.target.files.length > 0) {
                setProfileImage(e.target.files[0]); // Set the image to state
            }
        }}
    />
)}

    <h2>{developer?.firstName || "No Name"}</h2>
    <p>Developer</p>
    <button
        className="btn btn-primary"
        onClick={handleMessageClick}
        style={{ marginRight: '10px' }}
    >
        Message
    </button>

    {/* Edit Profile Button (Placed Below the Message Button) */}
    {isOwner && (
        <button
            onClick={() => setEditMode(!editMode)}
            className="btn btn-secondary mt-2"
            style={{
                display: 'block',
                width: '90%', // Ensures full width
                padding: '8px',
                borderRadius: '5px',
                marginTop: '10px' // Adds space between buttons
            }}
        >
            <FaEdit /> Edit Profile
        </button>
    )}
    {isOwner && (
    <button 
        style={{
            background: "red",
            color: "white",
            border: "none",
            padding: "10px",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "20px",
            width: "90%",
            marginRight: "27px",
        }}
        onClick={handleDeleteAccount}
    >
        ❌ Delete Account
    </button>
)}

</div>




          <div style={{ flex: 1 }}>
          {loggedInUser && loggedInUser.role === 'student' && (
            <button
              onClick={() => navigate(`/booksession/${developer._id}`)}
              style={{
                background: "blue",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
                marginBottom: "20px",
                display: "block"
              }}
            >
              Book Session
            </button>
          )}
          <h3 style={{ borderBottom: "3px solid blue", paddingBottom: "5px", display: "inline-block" }}>
        About Me
    </h3>
    {editMode ? (
        <ReactQuill 
            theme="snow" 
            value={formData.about} 
            onChange={(value) => setFormData({ ...formData, about: value })} 
        />
    ) : (
        <div dangerouslySetInnerHTML={{ __html: developer?.about }} />
    )}

<h3 style={{ borderBottom: "3px solid blue", paddingBottom: "5px", display: "inline-block", marginTop: "20px" }}>
        Hourly Rate & Working Hours
    </h3>
    {editMode ? (
        <>
            <input
                type="number"
                placeholder="Hourly Rate (Pkr/hr)"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                style={{ width: "100%", padding: "8px", marginBottom: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
                <input
                    type="time"
                    value={formData.workingHours.from}
                    onChange={(e) =>
                        setFormData({ ...formData, workingHours: { ...formData.workingHours, from: e.target.value } })
                    }
                    style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                />
                <input
                    type="time"
                    value={formData.workingHours.to}
                    onChange={(e) =>
                        setFormData({ ...formData, workingHours: { ...formData.workingHours, to: e.target.value } })
                    }
                    style={{ flex: 1, padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                />
            </div>
        </>
    ) : (
        <p>
           {developer?.hourlyRate ? `${developer.hourlyRate} per hr` : "Not Set"} |{" "}
{developer?.workingHours?.from && developer?.workingHours?.to
  ? `${convertTo12Hour(developer.workingHours.from)} to ${convertTo12Hour(developer.workingHours.to)}`
  : "No Working Hours Set"}

        </p>
    )}
             <div style={{ marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
    <h3 style={{
        borderBottom: "3px solid blue",
        paddingBottom: "5px",
        display: "inline-block",
        width: "50%"
    }}>
        Expertise
    </h3>
{expertise.map((exp, index) => (
    <div key={index} className="border p-2 mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p><strong>{exp.domain}</strong> - {exp.experienceYears} years experience, {exp.projects} projects</p>
        {editMode && (
            <div style={{ display: "flex", gap: "5px" }}>
                <button
                    style={{
                        background: "orange",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}
                    onClick={() => handleEditExpertise(exp)}
                >
                    ✏ Edit
                </button>
                <button
                    style={{
                        background: "red",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}
                    onClick={() => handleDeleteExpertise(exp._id)}
                >
                    ❌ Remove
                </button>
            </div>
        )}
    </div>
))}


{editMode && (
    <button
        style={{
            background: "blue",
            color: "white",
            border: "none",
            padding: "10px",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "10px"
        }}
        onClick={() => setShowExpertisePopup(true)}
    >
        ➕ Add Expertise
    </button>
)}
</div>


{/* Edit Expertise Modal */}
{showEditExpertisePopup && (
    <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    }}>
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            width: "400px",
            position: "relative",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
            <button style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer"
            }} onClick={() => setShowEditExpertisePopup(false)}>X</button>

            <h4>Edit Expertise</h4>
            <input type="text" placeholder="Domain" value={editExpertise.domain} onChange={(e) => setEditExpertise({ ...editExpertise, domain: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
            <input type="number" placeholder="Years of Experience" value={editExpertise.experienceYears} onChange={(e) => setEditExpertise({ ...editExpertise, experienceYears: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
            <input type="number" placeholder="Number of Projects" value={editExpertise.projects} onChange={(e) => setEditExpertise({ ...editExpertise, projects: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "10px" }} />
            <button style={{
                background: "blue",
                color: "white",
                padding: "10px",
                width: "100%",
                border: "none",
                borderRadius: "5px"
            }} onClick={handleUpdateExpertise}>Save</button>
        </div>
    </div>
)}

<div style={{ marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
    <h3 style={{
        borderBottom: "3px solid blue",
        paddingBottom: "5px",
        display: "inline-block",
        width: "50%"
    }}>
        Social Media Links
    </h3>
{editMode ? (
    <>
        <label><strong>LinkedIn:</strong></label>
        <input
            type="text"
            placeholder="LinkedIn Profile URL"
            value={formData.linkedIn}
            onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
            className="form-control mb-2"
        />

        <label><strong>GitHub:</strong></label>
        <input
            type="text"
            placeholder="GitHub Profile URL"
            value={formData.github}
            onChange={(e) => setFormData({ ...formData, github: e.target.value })}
            className="form-control mb-2"
        />
    </>
) : (
    <>
        <p><strong>LinkedIn:</strong> {developer?.linkedIn ? <a href={developer.linkedIn} target="_blank" rel="noopener noreferrer"><FaLinkedin size={20} color="blue" /></a> : "Not Set"}</p>
        <p><strong>GitHub:</strong> {developer?.github ? <a href={developer.github} target="_blank" rel="noopener noreferrer"><FaGithub size={20} color="black" /></a> : "Not Set"}</p>
    </>
)}
</div>

<h3 style={{
    borderBottom: "3px solid blue",
    paddingBottom: "5px",
    display: "inline-block",
    width: "50%",
    marginTop: "20px"
}}>
    Job Experience
</h3>

{jobExperience.map((job, index) => (
    <div key={index} className="border p-2 mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p><strong>{job.companyName}</strong> as {job.position}</p>
<p>
  from {formatDate(job.startDate)} to {formatDate(job.endDate)}
</p>

        {editMode && (
            <div style={{ display: "flex", gap: "5px" }}>
                <button
                    style={{
                        background: "orange",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}
                    onClick={() => handleEditJobExperience(job)} // ✅ Ensure job is passed
                >
                    ✏ Edit
                </button>
                <button
                    style={{
                        background: "red",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}
                    onClick={() => handleDeleteJobExperience(job._id)}
                >
                    ❌ Remove
                </button>
            </div>
        )}
    </div>
))}


{editMode && (
    <button
        style={{
            background: "blue",
            color: "white",
            border: "none",
            padding: "10px",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "10px"
        }}
        onClick={() => setShowJobPopup(true)}
    >
        ➕ Add Job Experience
    </button>
)}
{/* Edit Job Experience Modal */}
{showEditJobPopup && (
    <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    }}>
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            width: "400px",
            position: "relative",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
            <button style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer"
            }} onClick={() => setShowEditJobPopup(false)}>X</button>

            <h4>Edit Job Experience</h4>
            <input type="text" placeholder="Company Name" 
                value={editJob.companyName} 
                onChange={(e) => setEditJob({ ...editJob, companyName: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <input type="text" placeholder="Position" 
                value={editJob.position} 
                onChange={(e) => setEditJob({ ...editJob, position: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <input type="date" 
                value={editJob.startDate} 
                onChange={(e) => setEditJob({ ...editJob, startDate: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <input type="date" 
                value={editJob.endDate} 
                onChange={(e) => setEditJob({ ...editJob, endDate: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            
            {/* ✅ Fix: Ensure Save button calls `handleUpdateJobExperience` */}
            <button style={{
                background: "blue",
                color: "white",
                padding: "10px",
                width: "100%",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer"
            }} 
            onClick={handleUpdateJobExperience} // ✅ This calls the update function
            >
                Save
            </button>
        </div>
    </div>
)}


{editMode && (
    <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-start" }}>
        <button className="btn btn-success mt-3" onClick={handleProfileUpdate}>Save Changes</button>
    </div>
)}
          </div>
        </div>
      </div>


      {/* ✅ Expertise Popup Form */}
      {showExpertisePopup && (
    <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    }}>
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            width: "400px",
            position: "relative",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
            <button style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer"
            }} onClick={() => setShowExpertisePopup(false)}>X</button>

            <h4>Add Expertise</h4>
            <select 
                onChange={(e) => setNewExpertise({ ...newExpertise, domain: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            >
                <option value="">Select Domain</option>
                {expertiseOptions.map((exp) => (
                    <option key={exp} value={exp}>{exp}</option>
                ))}
            </select>
            <input type="number" placeholder="Years of Experience" onChange={(e) => setNewExpertise({ ...newExpertise, experienceYears: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <input type="number" placeholder="Number of Projects" onChange={(e) => setNewExpertise({ ...newExpertise, projects: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <button style={{
                background: "blue",
                color: "white",
                padding: "10px",
                width: "100%",
                border: "none",
                borderRadius: "5px"
            }} onClick={addExpertise}>Save</button>
        </div>
    </div>
)}

{showJobPopup && (
    <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    }}>
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            width: "400px",
            position: "relative",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
            <button style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer"
            }} onClick={() => setShowJobPopup(false)}>X</button>

            <h4>Add Job Experience</h4>
            <input type="text" placeholder="Company Name" value={newJob.companyName} onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <input type="text" placeholder="Position" value={newJob.position} onChange={(e) => setNewJob({ ...newJob, position: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <input type="date" value={newJob.startDate} onChange={(e) => setNewJob({ ...newJob, startDate: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <input type="date" value={newJob.endDate} onChange={(e) => setNewJob({ ...newJob, endDate: e.target.value })} 
                style={{ width: "100%", padding: "8px", marginBottom: "10px" }} 
            />
            <button style={{
                background: "blue",
                color: "white",
                padding: "10px",
                width: "100%",
                border: "none",
                borderRadius: "5px"
            }} onClick={addJobExperience}>Save</button>
        </div>
    </div>
)}

      
    </>
  );
};

export default Profile;
