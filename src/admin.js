function changeContent(sectionId) {
    // Hide all content sections
    let sections = document.querySelectorAll('.main-content > div');
    sections.forEach(function(section) {
        section.style.display = 'none';
    });

    // Show the selected section
    let selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
}