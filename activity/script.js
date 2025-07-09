document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const actionBtns = document.querySelectorAll('.action-btn');
    const addBtn = document.querySelector('.add-btn');
    
    // Tab switching functionality
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Here you would typically load different content based on the tab
            console.log(`Switched to ${this.textContent} tab`);
        });
    });
    
    // Action button functionality (like/comment)
    actionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('.icon');
            const count = this.querySelector('.count');
            
            if (icon.textContent === '♥') {
                // Toggle like state
                if (this.classList.contains('liked')) {
                    this.classList.remove('liked');
                    this.style.color = '#888';
                    count.textContent = parseInt(count.textContent) - 1;
                } else {
                    this.classList.add('liked');
                    this.style.color = '#ff6b6b';
                    count.textContent = parseInt(count.textContent) + 1;
                }
            } else if (icon.textContent === '💬') {
                // Comment functionality
                console.log('Comment clicked');
                // Here you would typically open a comment modal or navigate to comments
            }
        });
    });
    
    // Add button functionality
    addBtn.addEventListener('click', function() {
        console.log('Add button clicked');
        // Here you would typically open a modal to create new activity
        alert('Add new activity functionality would go here');
    });
    
    // Simple animation for activity items on load
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Smooth scrolling for activity feed
    const activityFeed = document.querySelector('.activity-feed');
    let isScrolling = false;
    
    activityFeed.addEventListener('scroll', function() {
        if (!isScrolling) {
            window.requestAnimationFrame(function() {
                // Add scroll-based animations here if needed
                isScrolling = false;
            });
            isScrolling = true;
        }
    });
});