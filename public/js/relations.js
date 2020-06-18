// Delete a relation - Main User
$(".ul-inv-rel").on("click", "span", function (event) {

    $('.ul-inv-rel').css("pointer-events", "none");

    $.ajax({
        url: 'http://localhost:8888/users/relations/' + $(this).attr('data-mongo-id'),
        method: 'DELETE',

        success: function () {

            setTimeout(function () {
                window.location.href = "http://localhost:8888/users/relations";
            }, 1500);


            $('.parent-alert-box').append("<div id=\"my-alert-box\" class=\"alert alert-danger\" role=\"alert\">\n" +
                "    <p>You have deleted a relation! </p>\n" +
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