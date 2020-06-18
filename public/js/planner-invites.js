// Reject an invite
$(".ul-inv-rel").on("click", "#span-inv-rel-plan", function (event) {

    $('.ul-inv-rel').css("pointer-events", "none");

    $.ajax({
        url: 'http://localhost:8888/users/planner-invites/' + $(this).attr('data-mongo-id'),
        method: 'DELETE',
        success: function(){

            setTimeout(function () {
                window.location.href = "http://localhost:8888/users/planner-invites";
            }, 1500);


            $('.parent-alert-box').append("<div id=\"my-alert-box\" class=\"alert alert-danger\" role=\"alert\">\n" +
                "    <p>You have rejected an invite! </p>\n" +
                "</div>");

        },
        error: function () {
            console.log('error');
        }
    });

    $(this).parent().fadeOut(1600, () => {
        $(this).remove();
    });

    // Ensures that no other parent events trigger
    event.stopPropagation();
});

// Approve an invite
$(".ul-inv-rel").on("click", "#span-inv-rel-plan-approve", function (event) {

    $('.ul-inv-rel').css("pointer-events", "none");

    $.ajax({
        url: 'http://localhost:8888/users/planner-invites/' + $(this).attr('data-mongo-id'),
        method: 'GET',
        success: function(){

            setTimeout(function () {
                window.location.href = "http://localhost:8888/users/planner-invites";
            }, 1500);


            $('.parent-alert-box').append("<div id=\"my-alert-box\" class=\"alert alert-success\" role=\"alert\">\n" +
                "    <p>You have successfully approved an invite! </p>\n" +
                "</div>");

        },
        error: function () {
            console.log('error');
        }
    });

    $(this).parent().fadeOut(1600, () => {
        $(this).remove();
    });

    // Ensures that no other parent events trigger
    event.stopPropagation();
});
